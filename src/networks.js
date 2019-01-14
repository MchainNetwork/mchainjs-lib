module.exports = {
    marbellachain: {
        messagePrefix: '\x15MarbellaChain Signed Message:\n',
        bech32: 'bc',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x32, //50 M
        scriptHash: 0x3a, //58 Q
        wif: 0x80 //128
    },
    marbellachain_testnet: {
        messagePrefix: '\x15MarbellaChain Signed Message:\n',
        bech32: 'tb',
        bip32: {
            public: 0x043587cf,
            private: 0x04358394
        },
        pubKeyHash: 0x6e, //110 m
        scriptHash: 0x78, //120 q
        wif: 0xef
    }
}
