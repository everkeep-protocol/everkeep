/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/everkeep_contract.json`.
 */
export type EverkeepContract = {
  "address": "3PGofgQL2x3YiWqSyEUkg6nGZR66bmH3vwCRQ6yu8Xr2",
  "metadata": {
    "name": "everkeepContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "EverKeep non-custodial inactivity-based token transfer policy"
  },
  "instructions": [
    {
      "name": "cancelVault",
      "docs": [
        "Revokes the vault's delegation on every token account passed as a",
        "writable remaining account, then closes the vault and refunds its rent.",
        "",
        "Every remaining account must be a distinct, writable SPL Token or",
        "Token-2022 account owned by the vault owner and currently delegated to",
        "this vault; anything else aborts the whole cancellation. The program of",
        "each account must be supplied as `token_program` / `token_2022_program`."
      ],
      "discriminator": [
        150,
        95,
        141,
        252,
        158,
        53,
        60,
        102
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "vault",
            "registry"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.nonce",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Required when any remaining account is an SPL Token account."
          ],
          "optional": true,
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "token2022Program",
          "docs": [
            "Required when any remaining account is a Token-2022 account."
          ],
          "optional": true,
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "checkIn",
      "discriminator": [
        209,
        253,
        4,
        217,
        250,
        241,
        207,
        50
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.nonce",
                "account": "vault"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "claimDelegatedTokens",
      "discriminator": [
        122,
        129,
        59,
        210,
        87,
        118,
        50,
        0
      ],
      "accounts": [
        {
          "name": "beneficiary",
          "signer": true,
          "relations": [
            "vault"
          ]
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vault.owner",
                "account": "vault"
              },
              {
                "kind": "account",
                "path": "vault.nonce",
                "account": "vault"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "ownerTokenAccount",
          "writable": true
        },
        {
          "name": "beneficiaryTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "requestedAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeVault",
      "discriminator": [
        48,
        191,
        163,
        44,
        71,
        129,
        63,
        164
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "registry.nextVaultNonce",
                "account": "ownerRegistry"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "inactivityPeriod",
          "type": "i64"
        },
        {
          "name": "beneficiary",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ownerRegistry",
      "discriminator": [
        123,
        40,
        39,
        22,
        233,
        7,
        45,
        181
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "events": [
    {
      "name": "claimExecuted",
      "discriminator": [
        212,
        136,
        197,
        46,
        221,
        19,
        219,
        5
      ]
    },
    {
      "name": "vaultCancelled",
      "discriminator": [
        137,
        72,
        110,
        157,
        80,
        107,
        59,
        181
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidInactivityPeriod",
      "msg": "Inactivity period must be between 1 second and MAX_INACTIVITY_PERIOD"
    },
    {
      "code": 6001,
      "name": "invalidBeneficiary",
      "msg": "Beneficiary must be a non-default key distinct from the owner, vault, and registry"
    },
    {
      "code": 6002,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6003,
      "name": "vaultInactive",
      "msg": "Vault is not active"
    },
    {
      "code": 6004,
      "name": "invalidAmount",
      "msg": "Requested amount must be greater than zero"
    },
    {
      "code": 6005,
      "name": "inactivityPeriodNotElapsed",
      "msg": "The owner's inactivity period has not elapsed yet"
    },
    {
      "code": 6006,
      "name": "unauthorizedOwner",
      "msg": "Signer is not the vault owner"
    },
    {
      "code": 6007,
      "name": "unauthorizedBeneficiary",
      "msg": "Signer is not the vault beneficiary"
    },
    {
      "code": 6008,
      "name": "missingTokenProgram",
      "msg": "The token program for a remaining token account was not supplied"
    },
    {
      "code": 6009,
      "name": "invalidTokenAccount",
      "msg": "Remaining account is not a token account owned by the vault owner"
    },
    {
      "code": 6010,
      "name": "vaultAlreadyActive",
      "msg": "Owner already has an active vault"
    },
    {
      "code": 6011,
      "name": "vaultRegistryMismatch",
      "msg": "Vault is not the owner's active vault"
    },
    {
      "code": 6012,
      "name": "notDelegatedToVault",
      "msg": "Token account is not delegated to this vault"
    },
    {
      "code": 6013,
      "name": "duplicateTokenAccount",
      "msg": "Token account was passed more than once"
    },
    {
      "code": 6014,
      "name": "tokenAccountNotWritable",
      "msg": "Token account to revoke must be writable"
    },
    {
      "code": 6015,
      "name": "unsupportedMintExtension",
      "msg": "Mint uses a Token-2022 extension that claims cannot support"
    }
  ],
  "types": [
    {
      "name": "claimExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "beneficiary",
            "type": "pubkey"
          },
          {
            "name": "requestedAmount",
            "type": "u64"
          },
          {
            "name": "amountClaimed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ownerRegistry",
      "docs": [
        "Permanent per-owner record. Never closed, so `next_vault_nonce` can only grow",
        "and vault PDAs are never re-derived."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "nextVaultNonce",
            "type": "u64"
          },
          {
            "name": "activeVault",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "beneficiary",
            "type": "pubkey"
          },
          {
            "name": "inactivityPeriod",
            "type": "i64"
          },
          {
            "name": "lastCheckIn",
            "type": "i64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "revokedTokenAccounts",
            "type": "u32"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "maxInactivityPeriod",
      "docs": [
        "Upper bound on `inactivity_period` (100 years). Keeps",
        "`last_check_in + inactivity_period` far from `i64::MAX`, so a vault can",
        "never become permanently unclaimable through overflow."
      ],
      "type": "i64",
      "value": "3153600000"
    },
    {
      "name": "registrySeed",
      "type": "bytes",
      "value": "[114, 101, 103, 105, 115, 116, 114, 121]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
