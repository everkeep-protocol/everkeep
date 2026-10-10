import * as anchor from "@anchor-lang/core";
import { BN, Program } from "@anchor-lang/core";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  approve,
  burn,
  createAssociatedTokenAccount,
  createInitializeMintInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeTransferHookInstruction,
  createMint,
  getAccount,
  getMintLen,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { EverkeepContract } from "../target/types/everkeep_contract";

const DECIMALS = 6;
const SHORT_PERIOD_SECS = 3;
const MAX_INACTIVITY_PERIOD = new BN("3153600000");
const I64_MAX = new BN("9223372036854775807");
const CONFIRMED = { commitment: "confirmed" as const };

describe("everkeep-contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.everkeepContract as Program<EverkeepContract>;
  const connection = provider.connection;
  // Pays fees and funds test accounts; never acts as a vault owner, so every
  // claim below is provably authorized without the owner's signature.
  const payer = (provider.wallet as anchor.Wallet).payer;

  const ownerA = Keypair.generate();
  const ownerB = Keypair.generate();
  const ownerC = Keypair.generate();
  const beneficiary = Keypair.generate();
  const attacker = Keypair.generate();

  const eventParser = new anchor.EventParser(
    program.programId,
    new anchor.BorshCoder(program.idl)
  );

  // ---------- helpers ----------

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const registryPda = (owner: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("registry"), owner.toBuffer()],
      program.programId
    )[0];

  const vaultPda = (owner: PublicKey, nonce: BN | number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        owner.toBuffer(),
        new BN(nonce.toString()).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    )[0];

  async function nextVaultPda(owner: PublicKey) {
    const registry = await program.account.ownerRegistry.fetchNullable(
      registryPda(owner),
      "confirmed"
    );
    return vaultPda(owner, registry ? registry.nextVaultNonce : 0);
  }

  // Clock layout: slot u64 | epoch_start_timestamp i64 | epoch u64 |
  // leader_schedule_epoch u64 | unix_timestamp i64
  async function chainTime(): Promise<number> {
    const info = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
    return Number(info!.data.readBigInt64LE(32));
  }

  async function waitUntilClaimable(vault: PublicKey) {
    const state = await program.account.vault.fetch(vault, "confirmed");
    const unlocksAt = state.lastCheckIn.toNumber() + state.inactivityPeriod.toNumber();
    while ((await chainTime()) < unlocksAt) {
      await sleep(500);
    }
  }

  async function expectFailure(promise: Promise<unknown>, code?: string) {
    try {
      await promise;
    } catch (err: any) {
      if (code) {
        const actual =
          err?.error?.errorCode?.code ??
          `${String(err)}\n${(err?.logs ?? err?.transactionLogs ?? []).join("\n")}`;
        expect(actual).to.include(code);
      }
      return;
    }
    expect.fail(`expected transaction to fail${code ? ` with ${code}` : ""}`);
  }

  async function fund(to: PublicKey, lamports: number) {
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: to, lamports })
    );
    await sendAndConfirmTransaction(connection, tx, [payer], CONFIRMED);
  }

  async function eventsOf(signature: string) {
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    return { tx: tx!, events: [...eventParser.parseLogs(tx!.meta!.logMessages!)] };
  }

  const tokenState = (address: PublicKey, programId = TOKEN_PROGRAM_ID) =>
    getAccount(connection, address, "confirmed", programId);

  async function newMint(programId = TOKEN_PROGRAM_ID) {
    return createMint(
      connection,
      payer,
      payer.publicKey,
      null,
      DECIMALS,
      Keypair.generate(),
      CONFIRMED,
      programId
    );
  }

  async function newToken2022MintWithExtensions(
    extensions: ExtensionType[],
    initExtensions: (mint: PublicKey) => TransactionInstruction[]
  ) {
    const mint = Keypair.generate();
    const space = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(space);
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      ...initExtensions(mint.publicKey),
      createInitializeMintInstruction(
        mint.publicKey,
        DECIMALS,
        payer.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID
      )
    );
    await sendAndConfirmTransaction(connection, tx, [payer, mint], CONFIRMED);
    return mint.publicKey;
  }

  const newAta = (mint: PublicKey, owner: PublicKey, programId = TOKEN_PROGRAM_ID) =>
    createAssociatedTokenAccount(connection, payer, mint, owner, CONFIRMED, programId);

  const mintTokens = (
    mint: PublicKey,
    to: PublicKey,
    amount: number,
    programId = TOKEN_PROGRAM_ID
  ) => mintTo(connection, payer, mint, to, payer, amount, [], CONFIRMED, programId);

  // Owner-signed SPL Token `Approve`: the only way an allowance is granted.
  const approveDelegate = (
    account: PublicKey,
    delegate: PublicKey,
    owner: Keypair,
    amount: number,
    programId = TOKEN_PROGRAM_ID
  ) =>
    approve(connection, payer, account, delegate, owner, amount, [], CONFIRMED, programId);

  async function initVault(owner: Keypair, period: BN | number, beneficiaryKey: PublicKey) {
    const vault = await nextVaultPda(owner.publicKey);
    await program.methods
      .initializeVault(new BN(period.toString()), beneficiaryKey)
      .accountsPartial({ owner: owner.publicKey, registry: registryPda(owner.publicKey), vault })
      .signers([owner])
      .rpc(CONFIRMED);
    return vault;
  }

  type ClaimArgs = {
    vault: PublicKey;
    requested: number | BN;
    mint: PublicKey;
    ownerTokenAccount: PublicKey;
    beneficiaryTokenAccount: PublicKey;
    signer?: Keypair;
    tokenProgram?: PublicKey;
  };

  function claimBuilder(args: ClaimArgs) {
    const signer = args.signer ?? beneficiary;
    return program.methods
      .claimDelegatedTokens(new BN(args.requested.toString()))
      .accountsPartial({
        beneficiary: signer.publicKey,
        vault: args.vault,
        mint: args.mint,
        ownerTokenAccount: args.ownerTokenAccount,
        beneficiaryTokenAccount: args.beneficiaryTokenAccount,
        tokenProgram: args.tokenProgram ?? TOKEN_PROGRAM_ID,
      })
      .signers([signer]);
  }

  async function claim(args: ClaimArgs) {
    const signature = await claimBuilder(args).rpc(CONFIRMED);
    const { tx, events } = await eventsOf(signature);
    const event = events.find((e) => e.name === "claimExecuted");
    expect(event, "ClaimExecuted event").to.exist;
    return {
      tx,
      event: event!.data as {
        owner: PublicKey;
        beneficiary: PublicKey;
        requestedAmount: BN;
        amountClaimed: BN;
      },
    };
  }

  type RemainingToken = { pubkey: PublicKey; isWritable?: boolean };

  function cancelBuilder(
    owner: Keypair,
    vault: PublicKey,
    accounts: RemainingToken[] = [],
    programs: { tokenProgram?: PublicKey | null; token2022Program?: PublicKey | null } = {},
    signer: Keypair = owner,
    registry: PublicKey = registryPda(signer.publicKey)
  ) {
    return program.methods
      .cancelVault()
      .accountsPartial({
        owner: signer.publicKey,
        vault,
        registry,
        tokenProgram: programs.tokenProgram === undefined ? TOKEN_PROGRAM_ID : programs.tokenProgram,
        token2022Program:
          programs.token2022Program === undefined
            ? TOKEN_2022_PROGRAM_ID
            : programs.token2022Program,
      })
      .remainingAccounts(
        accounts.map((a) => ({
          pubkey: a.pubkey,
          isSigner: false,
          isWritable: a.isWritable ?? true,
        }))
      )
      .signers([signer]);
  }

  // ---------- fixtures ----------

  let mint: PublicKey; // SPL Token
  let otherMint: PublicKey; // SPL Token, used for wrong-mint checks
  let ownerAta: PublicKey;
  let ownerOtherAta: PublicKey;
  let beneficiaryAta: PublicKey;
  let beneficiaryOtherAta: PublicKey;
  let attackerAta: PublicKey;
  let vaultA: PublicKey;

  before(async () => {
    for (const kp of [ownerA, ownerB, ownerC]) {
      await fund(kp.publicKey, 50_000_000);
    }
    mint = await newMint();
    otherMint = await newMint();
    ownerAta = await newAta(mint, ownerA.publicKey);
    ownerOtherAta = await newAta(otherMint, ownerA.publicKey);
    beneficiaryAta = await newAta(mint, beneficiary.publicKey);
    beneficiaryOtherAta = await newAta(otherMint, beneficiary.publicKey);
    attackerAta = await newAta(mint, attacker.publicKey);
    await mintTokens(mint, ownerAta, 1_000_000);
    await mintTokens(otherMint, ownerOtherAta, 1_000_000);
    await mintTokens(mint, attackerAta, 1_000_000);
  });

  // ---------- initialize_vault ----------

  describe("initialize_vault", () => {
    const rejectsPeriod = (period: BN) =>
      expectFailure(
        program.methods
          .initializeVault(period, beneficiary.publicKey)
          .accountsPartial({
            owner: ownerA.publicKey,
            registry: registryPda(ownerA.publicKey),
            vault: vaultPda(ownerA.publicKey, 0),
          })
          .signers([ownerA])
          .rpc(),
        "InvalidInactivityPeriod"
      );

    it("rejects a zero inactivity period", () => rejectsPeriod(new BN(0)));
    it("rejects a negative inactivity period", () => rejectsPeriod(new BN(-1)));
    it("rejects an inactivity period above MAX_INACTIVITY_PERIOD", () =>
      rejectsPeriod(MAX_INACTIVITY_PERIOD.addn(1)));
    it("rejects i64::MAX (previously reachable overflow lock-out)", () =>
      rejectsPeriod(I64_MAX));

    const rejectsBeneficiary = (key: PublicKey) =>
      expectFailure(
        program.methods
          .initializeVault(new BN(SHORT_PERIOD_SECS), key)
          .accountsPartial({
            owner: ownerA.publicKey,
            registry: registryPda(ownerA.publicKey),
            vault: vaultPda(ownerA.publicKey, 0),
          })
          .signers([ownerA])
          .rpc(),
        "InvalidBeneficiary"
      );

    it("rejects the owner as beneficiary", () => rejectsBeneficiary(ownerA.publicKey));
    it("rejects the default pubkey as beneficiary", () =>
      rejectsBeneficiary(PublicKey.default));
    it("rejects the vault PDA itself as beneficiary", () =>
      rejectsBeneficiary(vaultPda(ownerA.publicKey, 0)));
    it("rejects the registry PDA as beneficiary", () =>
      rejectsBeneficiary(registryPda(ownerA.publicKey)));

    it("accepts exactly MAX_INACTIVITY_PERIOD", async () => {
      const vault = await initVault(ownerB, MAX_INACTIVITY_PERIOD, beneficiary.publicKey);
      const state = await program.account.vault.fetch(vault, "confirmed");
      expect(state.inactivityPeriod.toString()).to.equal(MAX_INACTIVITY_PERIOD.toString());
      await cancelBuilder(ownerB, vault).rpc(CONFIRMED);
    });

    it("rejects a vault PDA that does not match the registry nonce", async () => {
      // ownerB's next nonce is 1; nonce 0 is the cancelled vault.
      await expectFailure(
        program.methods
          .initializeVault(new BN(SHORT_PERIOD_SECS), beneficiary.publicKey)
          .accountsPartial({
            owner: ownerB.publicKey,
            registry: registryPda(ownerB.publicKey),
            vault: vaultPda(ownerB.publicKey, 0),
          })
          .signers([ownerB])
          .rpc(),
        "ConstraintSeeds"
      );
    });

    it("creates the vault and registry with the current timestamp", async () => {
      const before = await chainTime();
      vaultA = await initVault(ownerA, SHORT_PERIOD_SECS, beneficiary.publicKey);
      expect(vaultA.toBase58()).to.equal(vaultPda(ownerA.publicKey, 0).toBase58());

      const state = await program.account.vault.fetch(vaultA, "confirmed");
      expect(state.owner.toBase58()).to.equal(ownerA.publicKey.toBase58());
      expect(state.beneficiary.toBase58()).to.equal(beneficiary.publicKey.toBase58());
      expect(state.inactivityPeriod.toNumber()).to.equal(SHORT_PERIOD_SECS);
      expect(state.lastCheckIn.toNumber()).to.be.gte(before);
      expect(state.isActive).to.equal(true);
      expect(state.nonce.toNumber()).to.equal(0);

      const registry = await program.account.ownerRegistry.fetch(
        registryPda(ownerA.publicKey),
        "confirmed"
      );
      expect(registry.owner.toBase58()).to.equal(ownerA.publicKey.toBase58());
      expect(registry.nextVaultNonce.toNumber()).to.equal(1);
      expect(registry.activeVault?.toBase58()).to.equal(vaultA.toBase58());
    });

    it("rejects a second vault while one is active", async () => {
      await expectFailure(
        initVault(ownerA, SHORT_PERIOD_SECS, beneficiary.publicKey),
        "VaultAlreadyActive"
      );
    });

    it("owner grants an explicit allowance with SPL Approve; tokens stay in the owner's wallet", async () => {
      await approveDelegate(ownerAta, vaultA, ownerA, 600_000);
      const account = await tokenState(ownerAta);
      expect(account.amount).to.equal(1_000_000n);
      expect(account.owner.toBase58()).to.equal(ownerA.publicKey.toBase58());
      expect(account.delegate?.toBase58()).to.equal(vaultA.toBase58());
      expect(account.delegatedAmount).to.equal(600_000n);
    });
  });

  // ---------- check_in ----------

  describe("check_in and the inactivity window", () => {
    const claimArgs = () => ({
      vault: vaultA,
      requested: 1,
      mint,
      ownerTokenAccount: ownerAta,
      beneficiaryTokenAccount: beneficiaryAta,
    });

    it("rejects check-in from a non-owner", async () => {
      await expectFailure(
        program.methods
          .checkIn()
          .accountsPartial({ owner: attacker.publicKey, vault: vaultA })
          .signers([attacker])
          .rpc(),
        "UnauthorizedOwner"
      );
    });

    it("rejects check-in from the beneficiary", async () => {
      await expectFailure(
        program.methods
          .checkIn()
          .accountsPartial({ owner: beneficiary.publicKey, vault: vaultA })
          .signers([beneficiary])
          .rpc(),
        "UnauthorizedOwner"
      );
    });

    it("blocks claims before the inactivity period elapses", async () => {
      await expectFailure(claim(claimArgs()), "InactivityPeriodNotElapsed");
    });

    it("owner check-in updates last_check_in and re-locks claims", async () => {
      await waitUntilClaimable(vaultA);
      const previous = (await program.account.vault.fetch(vaultA, "confirmed")).lastCheckIn;

      await program.methods
        .checkIn()
        .accountsPartial({ owner: ownerA.publicKey, vault: vaultA })
        .signers([ownerA])
        .rpc(CONFIRMED);

      const state = await program.account.vault.fetch(vaultA, "confirmed");
      expect(state.lastCheckIn.toNumber()).to.be.gt(previous.toNumber());
      await expectFailure(claim(claimArgs()), "InactivityPeriodNotElapsed");
    });
  });

  // ---------- claim_delegated_tokens ----------

  describe("claim_delegated_tokens", () => {
    const base = () => ({
      vault: vaultA,
      mint,
      ownerTokenAccount: ownerAta,
      beneficiaryTokenAccount: beneficiaryAta,
    });

    before(async () => {
      await waitUntilClaimable(vaultA);
    });

    it("rejects a claim signed by a non-beneficiary", async () => {
      await expectFailure(
        claimBuilder({ ...base(), requested: 1, signer: attacker }).rpc(),
        "UnauthorizedBeneficiary"
      );
    });

    it("rejects a mismatched mint", async () => {
      await expectFailure(
        claim({ ...base(), requested: 1, mint: otherMint }),
        "ConstraintTokenMint"
      );
    });

    it("rejects pulling from a token account the vault owner does not own, even if delegated", async () => {
      await approveDelegate(attackerAta, vaultA, attacker, 1_000_000);
      await expectFailure(
        claim({ ...base(), requested: 1, ownerTokenAccount: attackerAta }),
        "ConstraintTokenOwner"
      );
      expect((await tokenState(attackerAta)).amount).to.equal(1_000_000n);
    });

    it("rejects a destination token account not owned by the beneficiary", async () => {
      await expectFailure(
        claim({ ...base(), requested: 1, beneficiaryTokenAccount: attackerAta }),
        "ConstraintTokenOwner"
      );
    });

    it("rejects a destination for a different mint", async () => {
      await expectFailure(
        claim({ ...base(), requested: 1, beneficiaryTokenAccount: beneficiaryOtherAta }),
        "ConstraintTokenMint"
      );
    });

    it("rejects a token program that does not own the accounts", async () => {
      await expectFailure(
        claim({ ...base(), requested: 1, tokenProgram: TOKEN_2022_PROGRAM_ID })
      );
    });

    it("rejects a zero requested amount", async () => {
      await expectFailure(claim({ ...base(), requested: 0 }), "InvalidAmount");
    });

    it("transfers the full request without the owner's signature", async () => {
      const { tx, event } = await claim({ ...base(), requested: 400_000 });

      const keys = tx.transaction.message.getAccountKeys().staticAccountKeys;
      const signers = keys
        .slice(0, tx.transaction.message.header.numRequiredSignatures)
        .map((k) => k.toBase58());
      expect(signers).to.include(beneficiary.publicKey.toBase58());
      expect(signers).to.not.include(ownerA.publicKey.toBase58());

      expect(event.owner.toBase58()).to.equal(ownerA.publicKey.toBase58());
      expect(event.beneficiary.toBase58()).to.equal(beneficiary.publicKey.toBase58());
      expect(event.requestedAmount.toNumber()).to.equal(400_000);
      expect(event.amountClaimed.toNumber()).to.equal(400_000);

      const ownerAccount = await tokenState(ownerAta);
      expect(ownerAccount.amount).to.equal(600_000n);
      expect(ownerAccount.delegatedAmount).to.equal(200_000n);
      expect((await tokenState(beneficiaryAta)).amount).to.equal(400_000n);
    });

    it("supports repeated claims against the remaining allowance", async () => {
      const { event } = await claim({ ...base(), requested: 50_000 });
      expect(event.amountClaimed.toNumber()).to.equal(50_000);
      const ownerAccount = await tokenState(ownerAta);
      expect(ownerAccount.amount).to.equal(550_000n);
      expect(ownerAccount.delegatedAmount).to.equal(150_000n);
      expect((await tokenState(beneficiaryAta)).amount).to.equal(450_000n);
    });

    it("caps at the remaining allowance when it is below balance and request", async () => {
      const { event } = await claim({ ...base(), requested: 500_000 });
      expect(event.requestedAmount.toNumber()).to.equal(500_000);
      expect(event.amountClaimed.toNumber()).to.equal(150_000);

      const ownerAccount = await tokenState(ownerAta);
      expect(ownerAccount.amount).to.equal(400_000n);
      expect(ownerAccount.delegatedAmount).to.equal(0n);
      expect(ownerAccount.delegate).to.be.null;
    });

    it("claims 0 once the allowance is exhausted", async () => {
      const { event } = await claim({ ...base(), requested: 1_000 });
      expect(event.amountClaimed.toNumber()).to.equal(0);
      expect((await tokenState(ownerAta)).amount).to.equal(400_000n);
    });

    it("caps at the owner's balance when the owner spent tokens after approving", async () => {
      await approveDelegate(ownerAta, vaultA, ownerA, 500_000);
      await burn(connection, payer, ownerAta, mint, ownerA, 300_000, [], CONFIRMED);
      // balance 100k < allowance 500k < request 600k
      const { event } = await claim({ ...base(), requested: 600_000 });
      expect(event.amountClaimed.toNumber()).to.equal(100_000);
      expect((await tokenState(ownerAta)).amount).to.equal(0n);
      expect((await tokenState(beneficiaryAta)).amount).to.equal(700_000n);
    });

    it("claims 0 (and does not revert) when the owner's balance is empty", async () => {
      const { event } = await claim({ ...base(), requested: 1_000 });
      expect(event.requestedAmount.toNumber()).to.equal(1_000);
      expect(event.amountClaimed.toNumber()).to.equal(0);
      expect((await tokenState(beneficiaryAta)).amount).to.equal(700_000n);
    });

    it("claims 0 when the owner delegated to someone other than the vault", async () => {
      await mintTokens(mint, ownerAta, 200_000);
      await approveDelegate(ownerAta, attacker.publicKey, ownerA, 50_000);
      const { event } = await claim({ ...base(), requested: 10_000 });
      expect(event.amountClaimed.toNumber()).to.equal(0);
      const ownerAccount = await tokenState(ownerAta);
      expect(ownerAccount.amount).to.equal(200_000n);
      expect(ownerAccount.delegate?.toBase58()).to.equal(attacker.publicKey.toBase58());
    });

    describe("Token-2022", () => {
      let mint22: PublicKey;
      let ownerAta22: PublicKey;
      let beneficiaryAta22: PublicKey;

      it("claims from a plain Token-2022 mint", async () => {
        mint22 = await newMint(TOKEN_2022_PROGRAM_ID);
        ownerAta22 = await newAta(mint22, ownerA.publicKey, TOKEN_2022_PROGRAM_ID);
        beneficiaryAta22 = await newAta(mint22, beneficiary.publicKey, TOKEN_2022_PROGRAM_ID);
        await mintTokens(mint22, ownerAta22, 1_000_000, TOKEN_2022_PROGRAM_ID);
        await approveDelegate(ownerAta22, vaultA, ownerA, 300_000, TOKEN_2022_PROGRAM_ID);

        const { event } = await claim({
          vault: vaultA,
          requested: 500_000,
          mint: mint22,
          ownerTokenAccount: ownerAta22,
          beneficiaryTokenAccount: beneficiaryAta22,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        });
        expect(event.amountClaimed.toNumber()).to.equal(300_000);
        expect((await tokenState(ownerAta22, TOKEN_2022_PROGRAM_ID)).amount).to.equal(700_000n);
        expect((await tokenState(beneficiaryAta22, TOKEN_2022_PROGRAM_ID)).amount).to.equal(
          300_000n
        );
      });

      it("reports the gross amount debited for transfer-fee mints", async () => {
        const feeMint = await newToken2022MintWithExtensions(
          [ExtensionType.TransferFeeConfig],
          (m) => [
            createInitializeTransferFeeConfigInstruction(
              m,
              payer.publicKey,
              payer.publicKey,
              100, // 1%
              BigInt(1_000_000_000),
              TOKEN_2022_PROGRAM_ID
            ),
          ]
        );
        const ownerFeeAta = await newAta(feeMint, ownerA.publicKey, TOKEN_2022_PROGRAM_ID);
        const beneficiaryFeeAta = await newAta(
          feeMint,
          beneficiary.publicKey,
          TOKEN_2022_PROGRAM_ID
        );
        await mintTokens(feeMint, ownerFeeAta, 500_000, TOKEN_2022_PROGRAM_ID);
        await approveDelegate(ownerFeeAta, vaultA, ownerA, 100_000, TOKEN_2022_PROGRAM_ID);

        const { event } = await claim({
          vault: vaultA,
          requested: 100_000,
          mint: feeMint,
          ownerTokenAccount: ownerFeeAta,
          beneficiaryTokenAccount: beneficiaryFeeAta,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        });
        expect(event.amountClaimed.toNumber()).to.equal(100_000);
        expect((await tokenState(ownerFeeAta, TOKEN_2022_PROGRAM_ID)).amount).to.equal(400_000n);
        // 1% fee is withheld in the destination account.
        expect((await tokenState(beneficiaryFeeAta, TOKEN_2022_PROGRAM_ID)).amount).to.equal(
          99_000n
        );
      });

      it("rejects mints with an active transfer hook", async () => {
        const hookMint = await newToken2022MintWithExtensions(
          [ExtensionType.TransferHook],
          (m) => [
            createInitializeTransferHookInstruction(
              m,
              payer.publicKey,
              Keypair.generate().publicKey,
              TOKEN_2022_PROGRAM_ID
            ),
          ]
        );
        const ownerHookAta = await newAta(hookMint, ownerA.publicKey, TOKEN_2022_PROGRAM_ID);
        const beneficiaryHookAta = await newAta(
          hookMint,
          beneficiary.publicKey,
          TOKEN_2022_PROGRAM_ID
        );
        await mintTokens(hookMint, ownerHookAta, 100_000, TOKEN_2022_PROGRAM_ID);
        await approveDelegate(ownerHookAta, vaultA, ownerA, 100_000, TOKEN_2022_PROGRAM_ID);

        await expectFailure(
          claim({
            vault: vaultA,
            requested: 1,
            mint: hookMint,
            ownerTokenAccount: ownerHookAta,
            beneficiaryTokenAccount: beneficiaryHookAta,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          }),
          "UnsupportedMintExtension"
        );
      });

      it("rejects non-transferable mints", async () => {
        const ntMint = await newToken2022MintWithExtensions(
          [ExtensionType.NonTransferable],
          (m) => [createInitializeNonTransferableMintInstruction(m, TOKEN_2022_PROGRAM_ID)]
        );
        const ownerNtAta = await newAta(ntMint, ownerA.publicKey, TOKEN_2022_PROGRAM_ID);
        const beneficiaryNtAta = await newAta(ntMint, beneficiary.publicKey, TOKEN_2022_PROGRAM_ID);
        await mintTokens(ntMint, ownerNtAta, 100_000, TOKEN_2022_PROGRAM_ID);

        await expectFailure(
          claim({
            vault: vaultA,
            requested: 1,
            mint: ntMint,
            ownerTokenAccount: ownerNtAta,
            beneficiaryTokenAccount: beneficiaryNtAta,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          }),
          "UnsupportedMintExtension"
        );
      });
    });
  });

  // ---------- cancel_vault ----------

  describe("cancel_vault", () => {
    let mint22: PublicKey;
    let ownerAta22: PublicKey;

    before(async () => {
      // Owner A now has live vault delegations on one SPL and one Token-2022 account.
      await approveDelegate(ownerAta, vaultA, ownerA, 150_000);
      mint22 = await newMint(TOKEN_2022_PROGRAM_ID);
      ownerAta22 = await newAta(mint22, ownerA.publicKey, TOKEN_2022_PROGRAM_ID);
      await mintTokens(mint22, ownerAta22, 10_000, TOKEN_2022_PROGRAM_ID);
      await approveDelegate(ownerAta22, vaultA, ownerA, 10_000, TOKEN_2022_PROGRAM_ID);
    });

    async function expectVaultUntouched() {
      expect(await connection.getAccountInfo(vaultA, "confirmed")).to.not.be.null;
      expect((await tokenState(ownerAta)).delegate?.toBase58()).to.equal(vaultA.toBase58());
    }

    it("rejects cancellation by a non-owner", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [], {}, attacker, registryPda(ownerA.publicKey)).rpc(),
        "UnauthorizedOwner"
      );
      // With the attacker's own (nonexistent) registry it fails even earlier.
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [], {}, attacker).rpc(),
        "AccountNotInitialized"
      );
      await expectVaultUntouched();
    });

    it("rejects a token account that is not delegated to the vault (no silent skip)", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: ownerAta }, { pubkey: ownerOtherAta }]).rpc(),
        "NotDelegatedToVault"
      );
      await expectVaultUntouched();
    });

    it("rejects an SPL account when the SPL Token program is missing", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: ownerAta }], { tokenProgram: null }).rpc(),
        "MissingTokenProgram"
      );
      await expectVaultUntouched();
    });

    it("rejects a Token-2022 account when the Token-2022 program is missing", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: ownerAta22 }], { token2022Program: null }).rpc(),
        "MissingTokenProgram"
      );
      await expectVaultUntouched();
    });

    it("rejects a read-only token account", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: ownerAta, isWritable: false }]).rpc(),
        "TokenAccountNotWritable"
      );
      await expectVaultUntouched();
    });

    it("rejects a token account owned by someone else", async () => {
      // attackerAta is delegated to vaultA (from an earlier test) but not owned by ownerA.
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: attackerAta }]).rpc(),
        "InvalidTokenAccount"
      );
      await expectVaultUntouched();
    });

    it("rejects accounts that are not token accounts", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: beneficiary.publicKey }]).rpc(),
        "InvalidTokenAccount"
      );
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: mint }]).rpc(),
        "InvalidTokenAccount"
      );
      await expectVaultUntouched();
    });

    it("rejects duplicate token accounts", async () => {
      await expectFailure(
        cancelBuilder(ownerA, vaultA, [{ pubkey: ownerAta }, { pubkey: ownerAta }]).rpc(),
        "DuplicateTokenAccount"
      );
      await expectVaultUntouched();
    });

    it("revokes every passed delegation across SPL and Token-2022, then closes the vault", async () => {
      const vaultLamports = (await connection.getAccountInfo(vaultA, "confirmed"))!.lamports;
      const ownerLamportsBefore = await connection.getBalance(ownerA.publicKey, "confirmed");

      const signature = await cancelBuilder(ownerA, vaultA, [
        { pubkey: ownerAta },
        { pubkey: ownerAta22 },
      ]).rpc(CONFIRMED);

      const { events } = await eventsOf(signature);
      const cancelled = events.find((e) => e.name === "vaultCancelled");
      expect(cancelled, "VaultCancelled event").to.exist;
      expect(cancelled!.data.revokedTokenAccounts).to.equal(2);
      expect(cancelled!.data.vault.toBase58()).to.equal(vaultA.toBase58());

      expect(await connection.getAccountInfo(vaultA, "confirmed")).to.be.null;
      const spl = await tokenState(ownerAta);
      expect(spl.delegate).to.be.null;
      expect(spl.delegatedAmount).to.equal(0n);
      const t22 = await tokenState(ownerAta22, TOKEN_2022_PROGRAM_ID);
      expect(t22.delegate).to.be.null;
      expect(t22.delegatedAmount).to.equal(0n);

      const registry = await program.account.ownerRegistry.fetch(
        registryPda(ownerA.publicKey),
        "confirmed"
      );
      expect(registry.activeVault).to.be.null;

      // Owner is not the fee payer, so the full vault rent is refunded.
      const ownerLamportsAfter = await connection.getBalance(ownerA.publicKey, "confirmed");
      expect(ownerLamportsAfter).to.equal(ownerLamportsBefore + vaultLamports);
    });

    it("rejects check-in, claims, and a second cancel after closure", async () => {
      await expectFailure(
        program.methods
          .checkIn()
          .accountsPartial({ owner: ownerA.publicKey, vault: vaultA })
          .signers([ownerA])
          .rpc(),
        "AccountNotInitialized"
      );
      await expectFailure(
        claim({
          vault: vaultA,
          requested: 1,
          mint,
          ownerTokenAccount: ownerAta,
          beneficiaryTokenAccount: beneficiaryAta,
        }),
        "AccountNotInitialized"
      );
      await expectFailure(cancelBuilder(ownerA, vaultA).rpc(), "AccountNotInitialized");
    });
  });

  // ---------- PDA reuse ----------

  describe("vault PDA reuse after cancellation", () => {
    let ownerCAta: PublicKey;
    let oldVault: PublicKey;
    let newVault: PublicKey;

    before(async () => {
      ownerCAta = await newAta(mint, ownerC.publicKey);
      await mintTokens(mint, ownerCAta, 500_000);
    });

    it("a stale delegation left on a cancelled vault stays unusable after re-initialization", async () => {
      oldVault = await initVault(ownerC, 1, beneficiary.publicKey);
      await approveDelegate(ownerCAta, oldVault, ownerC, 500_000);

      // Cancel without listing the delegated account: the program cannot
      // enumerate approvals, so the stale delegation remains on-chain.
      await cancelBuilder(ownerC, oldVault).rpc(CONFIRMED);
      expect((await tokenState(ownerCAta)).delegate?.toBase58()).to.equal(oldVault.toBase58());

      newVault = await initVault(ownerC, 1, beneficiary.publicKey);
      expect(newVault.toBase58()).to.not.equal(oldVault.toBase58());
      expect(newVault.toBase58()).to.equal(vaultPda(ownerC.publicKey, 1).toBase58());
      expect(await connection.getAccountInfo(oldVault, "confirmed")).to.be.null;

      await waitUntilClaimable(newVault);
      const { event } = await claim({
        vault: newVault,
        requested: 500_000,
        mint,
        ownerTokenAccount: ownerCAta,
        beneficiaryTokenAccount: beneficiaryAta,
      });
      expect(event.amountClaimed.toNumber()).to.equal(0);
      expect((await tokenState(ownerCAta)).amount).to.equal(500_000n);

      await expectFailure(
        claim({
          vault: oldVault,
          requested: 500_000,
          mint,
          ownerTokenAccount: ownerCAta,
          beneficiaryTokenAccount: beneficiaryAta,
        }),
        "AccountNotInitialized"
      );
    });

    it("the cancelled vault address can never be re-initialized", async () => {
      await cancelBuilder(ownerC, newVault).rpc(CONFIRMED);
      await expectFailure(
        program.methods
          .initializeVault(new BN(1), beneficiary.publicKey)
          .accountsPartial({
            owner: ownerC.publicKey,
            registry: registryPda(ownerC.publicKey),
            vault: oldVault,
          })
          .signers([ownerC])
          .rpc(),
        "ConstraintSeeds"
      );
      const registry = await program.account.ownerRegistry.fetch(
        registryPda(ownerC.publicKey),
        "confirmed"
      );
      expect(registry.nextVaultNonce.toNumber()).to.equal(2);
    });
  });
});
