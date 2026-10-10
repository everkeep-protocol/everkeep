//! EverKeep: a non-custodial inactivity-based token transfer policy.
//!
//! Assets never leave the owner's wallet. The owner approves the `Vault` PDA as
//! SPL Token delegate (with an explicit allowance) on any token accounts they
//! want covered by the policy, using the token program's own `Approve`
//! instruction. Once the owner has not checked in for `inactivity_period`
//! seconds, the beneficiary may pull up to the remaining allowance through this
//! program, which signs the transfer as the delegate using the vault PDA seeds.
//!
//! Inactivity is only the absence of check-ins; the program has no knowledge of
//! why an owner stopped checking in. Because the owner keeps custody, they can
//! spend or revoke at any time, so no particular claim amount is guaranteed.
//!
//! Vault addresses are never reused: each owner has a permanent
//! `OwnerRegistry` whose nonce is part of the vault seeds and only increases.
//! A delegation left pointing at a cancelled vault can therefore never be
//! exercised again, even if the owner later creates a new vault.

use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token_2022::spl_token_2022::{
    extension::{
        non_transferable::NonTransferable, transfer_hook::TransferHook, BaseStateWithExtensions,
        StateWithExtensions,
    },
    state::Mint as Token2022MintState,
};
use anchor_spl::token_interface::{
    self, Mint, Revoke, Token2022, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("3PGofgQL2x3YiWqSyEUkg6nGZR66bmH3vwCRQ6yu8Xr2");

#[constant]
pub const VAULT_SEED: &[u8] = b"vault";

#[constant]
pub const REGISTRY_SEED: &[u8] = b"registry";

/// Upper bound on `inactivity_period` (100 years). Keeps
/// `last_check_in + inactivity_period` far from `i64::MAX`, so a vault can
/// never become permanently unclaimable through overflow.
#[constant]
pub const MAX_INACTIVITY_PERIOD: i64 = 3_153_600_000_i64;

#[program]
pub mod everkeep_contract {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        inactivity_period: i64,
        beneficiary: Pubkey,
    ) -> Result<()> {
        require!(
            inactivity_period > 0 && inactivity_period <= MAX_INACTIVITY_PERIOD,
            EverKeepError::InvalidInactivityPeriod
        );
        let owner_key = ctx.accounts.owner.key();
        let vault_key = ctx.accounts.vault.key();
        require!(
            beneficiary != Pubkey::default()
                && beneficiary != owner_key
                && beneficiary != vault_key
                && beneficiary != ctx.accounts.registry.key(),
            EverKeepError::InvalidBeneficiary
        );

        let registry = &mut ctx.accounts.registry;
        if registry.owner == Pubkey::default() {
            registry.owner = owner_key;
            registry.bump = ctx.bumps.registry;
        }
        require!(
            registry.active_vault.is_none(),
            EverKeepError::VaultAlreadyActive
        );

        let nonce = registry.next_vault_nonce;
        registry.next_vault_nonce = nonce.checked_add(1).ok_or(EverKeepError::MathOverflow)?;
        registry.active_vault = Some(vault_key);

        let now = Clock::get()?.unix_timestamp;
        unlock_timestamp(now, inactivity_period)?;

        ctx.accounts.vault.set_inner(Vault {
            owner: owner_key,
            beneficiary,
            inactivity_period,
            last_check_in: now,
            is_active: true,
            nonce,
            bump: ctx.bumps.vault,
        });
        Ok(())
    }

    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.is_active, EverKeepError::VaultInactive);
        vault.last_check_in = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn claim_delegated_tokens(
        ctx: Context<ClaimDelegatedTokens>,
        requested_amount: u64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(vault.is_active, EverKeepError::VaultInactive);
        require!(requested_amount > 0, EverKeepError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        let unlocks_at = unlock_timestamp(vault.last_check_in, vault.inactivity_period)?;
        require!(now >= unlocks_at, EverKeepError::InactivityPeriodNotElapsed);

        validate_mint_extensions(&ctx.accounts.mint.to_account_info())?;

        let source = &ctx.accounts.owner_token_account;
        let allowance = if Option::<Pubkey>::from(source.delegate) == Some(vault.key()) {
            source.delegated_amount
        } else {
            0
        };
        let amount_claimed = claimable_amount(source.amount, requested_amount, allowance);

        if amount_claimed > 0 {
            let owner_key = vault.owner;
            let nonce_bytes = vault.nonce.to_le_bytes();
            let signer_seeds: &[&[&[u8]]] =
                &[&[VAULT_SEED, owner_key.as_ref(), &nonce_bytes, &[vault.bump]]];
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.owner_token_account.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.beneficiary_token_account.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount_claimed,
                ctx.accounts.mint.decimals,
            )?;
        }

        emit!(ClaimExecuted {
            owner: vault.owner,
            beneficiary: vault.beneficiary,
            requested_amount,
            amount_claimed,
        });
        Ok(())
    }

    /// Revokes the vault's delegation on every token account passed as a
    /// writable remaining account, then closes the vault and refunds its rent.
    ///
    /// Every remaining account must be a distinct, writable SPL Token or
    /// Token-2022 account owned by the vault owner and currently delegated to
    /// this vault; anything else aborts the whole cancellation. The program of
    /// each account must be supplied as `token_program` / `token_2022_program`.
    pub fn cancel_vault<'info>(ctx: Context<'info, CancelVault<'info>>) -> Result<()> {
        let owner_key = ctx.accounts.owner.key();
        let vault_key = ctx.accounts.vault.key();
        require!(
            ctx.accounts.registry.active_vault == Some(vault_key),
            EverKeepError::VaultRegistryMismatch
        );

        let mut revoked: Vec<Pubkey> = Vec::with_capacity(ctx.remaining_accounts.len());
        for account_info in ctx.remaining_accounts.iter() {
            require!(
                !revoked.contains(account_info.key),
                EverKeepError::DuplicateTokenAccount
            );
            require!(
                account_info.is_writable,
                EverKeepError::TokenAccountNotWritable
            );

            let token_program_id = if *account_info.owner == Token::id() {
                require!(
                    ctx.accounts.token_program.is_some(),
                    EverKeepError::MissingTokenProgram
                );
                Token::id()
            } else if *account_info.owner == Token2022::id() {
                require!(
                    ctx.accounts.token_2022_program.is_some(),
                    EverKeepError::MissingTokenProgram
                );
                Token2022::id()
            } else {
                return err!(EverKeepError::InvalidTokenAccount);
            };

            let token_account = InterfaceAccount::<TokenAccount>::try_from(account_info)
                .map_err(|_| error!(EverKeepError::InvalidTokenAccount))?;
            require_keys_eq!(
                token_account.owner,
                owner_key,
                EverKeepError::InvalidTokenAccount
            );
            require!(
                Option::<Pubkey>::from(token_account.delegate) == Some(vault_key),
                EverKeepError::NotDelegatedToVault
            );

            token_interface::revoke(CpiContext::new(
                token_program_id,
                Revoke {
                    source: account_info.clone(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ))?;
            revoked.push(*account_info.key);
        }

        ctx.accounts.registry.active_vault = None;
        ctx.accounts.vault.is_active = false;

        emit!(VaultCancelled {
            owner: owner_key,
            vault: vault_key,
            revoked_token_accounts: revoked.len() as u32,
        });
        Ok(())
    }
}

pub fn unlock_timestamp(last_check_in: i64, inactivity_period: i64) -> Result<i64> {
    last_check_in
        .checked_add(inactivity_period)
        .ok_or_else(|| error!(EverKeepError::MathOverflow))
}

/// The token program rejects transfers above either the balance or the
/// remaining delegated allowance, so the claim is capped by both.
pub fn claimable_amount(owner_balance: u64, requested_amount: u64, allowance: u64) -> u64 {
    owner_balance.min(requested_amount).min(allowance)
}

/// Rejects Token-2022 mints whose transfers this instruction cannot complete:
/// transfer hooks need extra accounts that are not forwarded, and
/// non-transferable mints cannot move at all.
fn validate_mint_extensions(mint: &AccountInfo) -> Result<()> {
    if *mint.owner != Token2022::id() {
        return Ok(());
    }
    let data = mint.try_borrow_data()?;
    let state = StateWithExtensions::<Token2022MintState>::unpack(&data)?;
    if let Ok(hook) = state.get_extension::<TransferHook>() {
        require!(
            Option::<Pubkey>::from(hook.program_id).is_none(),
            EverKeepError::UnsupportedMintExtension
        );
    }
    require!(
        state.get_extension::<NonTransferable>().is_err(),
        EverKeepError::UnsupportedMintExtension
    );
    Ok(())
}

/// Permanent per-owner record. Never closed, so `next_vault_nonce` can only grow
/// and vault PDAs are never re-derived.
#[account]
#[derive(InitSpace)]
pub struct OwnerRegistry {
    pub owner: Pubkey,
    pub next_vault_nonce: u64,
    pub active_vault: Option<Pubkey>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub inactivity_period: i64,
    pub last_check_in: i64,
    pub is_active: bool,
    pub nonce: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + OwnerRegistry::INIT_SPACE,
        seeds = [REGISTRY_SEED, owner.key().as_ref()],
        bump,
    )]
    pub registry: Account<'info, OwnerRegistry>,
    #[account(
        init,
        payer = owner,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref(), &registry.next_vault_nonce.to_le_bytes()],
        bump,
    )]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), &vault.nonce.to_le_bytes()],
        bump = vault.bump,
        has_one = owner @ EverKeepError::UnauthorizedOwner,
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct ClaimDelegatedTokens<'info> {
    pub beneficiary: Signer<'info>,
    #[account(
        seeds = [VAULT_SEED, vault.owner.as_ref(), &vault.nonce.to_le_bytes()],
        bump = vault.bump,
        has_one = beneficiary @ EverKeepError::UnauthorizedBeneficiary,
    )]
    pub vault: Account<'info, Vault>,
    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = vault.owner,
        token::token_program = token_program,
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = beneficiary,
        token::token_program = token_program,
    )]
    pub beneficiary_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CancelVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.owner.as_ref(), &vault.nonce.to_le_bytes()],
        bump = vault.bump,
        has_one = owner @ EverKeepError::UnauthorizedOwner,
        close = owner,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        seeds = [REGISTRY_SEED, owner.key().as_ref()],
        bump = registry.bump,
        has_one = owner @ EverKeepError::UnauthorizedOwner,
    )]
    pub registry: Account<'info, OwnerRegistry>,
    /// Required when any remaining account is an SPL Token account.
    pub token_program: Option<Program<'info, Token>>,
    /// Required when any remaining account is a Token-2022 account.
    pub token_2022_program: Option<Program<'info, Token2022>>,
}

#[event]
pub struct ClaimExecuted {
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub requested_amount: u64,
    pub amount_claimed: u64,
}

#[event]
pub struct VaultCancelled {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub revoked_token_accounts: u32,
}

#[error_code]
pub enum EverKeepError {
    #[msg("Inactivity period must be between 1 second and MAX_INACTIVITY_PERIOD")]
    InvalidInactivityPeriod,
    #[msg("Beneficiary must be a non-default key distinct from the owner, vault, and registry")]
    InvalidBeneficiary,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Vault is not active")]
    VaultInactive,
    #[msg("Requested amount must be greater than zero")]
    InvalidAmount,
    #[msg("The owner's inactivity period has not elapsed yet")]
    InactivityPeriodNotElapsed,
    #[msg("Signer is not the vault owner")]
    UnauthorizedOwner,
    #[msg("Signer is not the vault beneficiary")]
    UnauthorizedBeneficiary,
    #[msg("The token program for a remaining token account was not supplied")]
    MissingTokenProgram,
    #[msg("Remaining account is not a token account owned by the vault owner")]
    InvalidTokenAccount,
    #[msg("Owner already has an active vault")]
    VaultAlreadyActive,
    #[msg("Vault is not the owner's active vault")]
    VaultRegistryMismatch,
    #[msg("Token account is not delegated to this vault")]
    NotDelegatedToVault,
    #[msg("Token account was passed more than once")]
    DuplicateTokenAccount,
    #[msg("Token account to revoke must be writable")]
    TokenAccountNotWritable,
    #[msg("Mint uses a Token-2022 extension that claims cannot support")]
    UnsupportedMintExtension,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unlock_boundary_is_inclusive() {
        let unlocks_at = unlock_timestamp(1_000, 60).unwrap();
        assert_eq!(unlocks_at, 1_060);
        assert!(1_059 < unlocks_at);
        assert!(1_060 >= unlocks_at);
    }

    #[test]
    fn unlock_overflow_is_an_error() {
        assert!(unlock_timestamp(i64::MAX, 1).is_err());
        assert!(unlock_timestamp(i64::MAX - MAX_INACTIVITY_PERIOD, MAX_INACTIVITY_PERIOD).is_ok());
    }

    #[test]
    fn max_period_cannot_overflow_for_realistic_timestamps() {
        // Year ~2286 in seconds; far beyond any plausible cluster clock.
        let far_future = 10_000_000_000i64;
        assert!(unlock_timestamp(far_future, MAX_INACTIVITY_PERIOD).is_ok());
    }

    #[test]
    fn claim_is_capped_by_balance_request_and_allowance() {
        assert_eq!(claimable_amount(1_000, 400, 1_000), 400);
        assert_eq!(claimable_amount(100, 400, 1_000), 100);
        assert_eq!(claimable_amount(1_000, 400, 250), 250);
        assert_eq!(claimable_amount(0, 400, 1_000), 0);
        assert_eq!(claimable_amount(1_000, 400, 0), 0);
        assert_eq!(claimable_amount(u64::MAX, u64::MAX, u64::MAX), u64::MAX);
    }
}
