/** BondingCurveDeployer — đồng bộ contract-bonding (deploy script gọi setCurveDeployer). */
export const bondingCurveDeployerAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_tokenFactory",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "targetValue",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenRaise",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "priceFeed",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "virtualTokenReserve",
        "type": "uint256"
      }
    ],
    "name": "deployBondingCurve",
    "outputs": [
      {
        "internalType": "address",
        "name": "curve",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenFactory",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
