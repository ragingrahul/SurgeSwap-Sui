/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/surge_oracle.json`.
 */
export type SurgeOracle = {
  "address": "Dt3xxWhMg9RSvYyWwekqyU1jG7v7JKomMZ9seDPZU4L1",
  "metadata": {
    "name": "surgeOracle",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initializeVolatilityStats",
      "discriminator": [
        179,
        242,
        23,
        67,
        123,
        181,
        73,
        33
      ],
      "accounts": [
        {
          "name": "volatilityStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  108,
                  97,
                  116,
                  105,
                  108,
                  105,
                  116,
                  121,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateVolatility",
      "discriminator": [
        190,
        105,
        116,
        221,
        229,
        198,
        208,
        83
      ],
      "accounts": [
        {
          "name": "volatilityStats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  108,
                  97,
                  116,
                  105,
                  108,
                  105,
                  116,
                  121,
                  95,
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "volatilityStats"
          ]
        },
        {
          "name": "priceUpdate"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "priceUpdateV2",
      "discriminator": [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    },
    {
      "name": "volatilityStats",
      "discriminator": [
        218,
        10,
        89,
        31,
        234,
        239,
        216,
        4
      ]
    }
  ],
  "events": [
    {
      "name": "volatilityUpdated",
      "discriminator": [
        65,
        23,
        5,
        195,
        172,
        173,
        255,
        87
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPythAccount",
      "msg": "Invalid Pyth price account"
    },
    {
      "code": 6001,
      "name": "noPriceAvailable",
      "msg": "No price is available from Pyth"
    },
    {
      "code": 6002,
      "name": "invalidPriceData",
      "msg": "Invalid price data"
    },
    {
      "code": 6003,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    }
  ],
  "types": [
    {
      "name": "priceFeedMessage",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feedId",
            "docs": [
              "`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "exponent",
            "type": "i32"
          },
          {
            "name": "publishTime",
            "docs": [
              "The timestamp of this price update in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "prevPublishTime",
            "docs": [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            "type": "i64"
          },
          {
            "name": "emaPrice",
            "type": "i64"
          },
          {
            "name": "emaConf",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceUpdateV2",
      "docs": [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "writeAuthority",
            "type": "pubkey"
          },
          {
            "name": "verificationLevel",
            "type": {
              "defined": {
                "name": "verificationLevel"
              }
            }
          },
          {
            "name": "priceMessage",
            "type": {
              "defined": {
                "name": "priceFeedMessage"
              }
            }
          },
          {
            "name": "postedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "verificationLevel",
      "docs": [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "partial",
            "fields": [
              {
                "name": "numSignatures",
                "type": "u8"
              }
            ]
          },
          {
            "name": "full"
          }
        ]
      }
    },
    {
      "name": "volatilityStats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "lastPrice",
            "type": "u64"
          },
          {
            "name": "mean",
            "type": "f64"
          },
          {
            "name": "m2",
            "type": "f64"
          },
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "annualizedVolatility",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "volatilityUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currentPrice",
            "type": "u64"
          },
          {
            "name": "mean",
            "type": "f64"
          },
          {
            "name": "m2",
            "type": "f64"
          },
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "annualizedVolatility",
            "type": "f64"
          }
        ]
      }
    }
  ]
};
