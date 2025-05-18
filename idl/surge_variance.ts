/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/surge_variance.json`.
 */
export type SurgeVariance = {
  "address": "4aL6kUNn43DEwEdUvcjrDrofZwJNPYcfPZqoTZfg2BSk",
  "metadata": {
    "name": "surgeVariance",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initializeMarket",
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "usdcVault",
          "writable": true
        },
        {
          "name": "varLongMint",
          "writable": true
        },
        {
          "name": "varShortMint",
          "writable": true
        },
        {
          "name": "volatilityStats",
          "docs": [
            "The volatility stats account from the oracle program"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "strike",
          "type": "f64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "bumps",
          "type": {
            "defined": {
              "name": "marketBumps"
            }
          }
        }
      ]
    },
    {
      "name": "mintTokens",
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "userAuthority",
          "signer": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true
        },
        {
          "name": "varLongMint",
          "writable": true
        },
        {
          "name": "varShortMint",
          "writable": true
        },
        {
          "name": "userVarLong",
          "writable": true
        },
        {
          "name": "userVarShort",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "isLong",
          "type": "bool"
        },
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "bumps",
          "type": {
            "defined": {
              "name": "marketBumps"
            }
          }
        }
      ]
    },
    {
      "name": "redeem",
      "discriminator": [
        184,
        12,
        86,
        149,
        70,
        196,
        97,
        225
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "userAuthority",
          "signer": true
        },
        {
          "name": "userUsdc",
          "writable": true
        },
        {
          "name": "usdcVault",
          "writable": true
        },
        {
          "name": "varLongMint",
          "writable": true
        },
        {
          "name": "varShortMint",
          "writable": true
        },
        {
          "name": "userVarLong",
          "writable": true
        },
        {
          "name": "userVarShort",
          "writable": true
        },
        {
          "name": "volatilityStats",
          "docs": [
            "The volatility stats account from the oracle program"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "epoch",
          "type": "u64"
        },
        {
          "name": "timestamp",
          "type": "i64"
        },
        {
          "name": "bumps",
          "type": {
            "defined": {
              "name": "marketBumps"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    }
  ],
  "events": [
    {
      "name": "marketInitialized",
      "discriminator": [
        134,
        160,
        122,
        87,
        50,
        3,
        255,
        81
      ]
    },
    {
      "name": "marketRedeemed",
      "discriminator": [
        234,
        87,
        146,
        137,
        120,
        19,
        232,
        204
      ]
    },
    {
      "name": "tokensMinted",
      "discriminator": [
        207,
        212,
        128,
        194,
        175,
        54,
        64,
        24
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "marketExpired",
      "msg": "Market is already expired"
    },
    {
      "code": 6001,
      "name": "numberOverflow",
      "msg": "Numeric overflow occurred"
    }
  ],
  "types": [
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "strike",
            "type": "f64"
          },
          {
            "name": "realizedVariance",
            "type": "f64"
          },
          {
            "name": "varLongMint",
            "type": "pubkey"
          },
          {
            "name": "varShortMint",
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "volatilityStats",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "startVolatility",
            "type": "f64"
          },
          {
            "name": "bumps",
            "type": {
              "defined": {
                "name": "marketBumps"
              }
            }
          },
          {
            "name": "isInitialized",
            "type": "bool"
          },
          {
            "name": "isExpired",
            "type": "bool"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "marketBumps",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "usdcVault",
            "type": "pubkey"
          },
          {
            "name": "varLongMint",
            "type": "pubkey"
          },
          {
            "name": "varShortMint",
            "type": "pubkey"
          },
          {
            "name": "epoch",
            "type": "u64"
          },
          {
            "name": "strike",
            "type": "f64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "startVolatility",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "marketRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "realizedVariance",
            "type": "f64"
          },
          {
            "name": "strike",
            "type": "f64"
          },
          {
            "name": "longPayout",
            "type": "u64"
          },
          {
            "name": "shortPayout",
            "type": "u64"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tokensMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "isLong",
            "type": "bool"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
