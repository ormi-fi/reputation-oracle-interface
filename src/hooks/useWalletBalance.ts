import { useEffect, useState } from 'react';
import { useMoralis, useMoralisWeb3Api } from 'react-moralis';

export interface WalletBalance {
  symbol: string;
  name: string;
  balance: number;
  price?: number;
  value?: number;
  token_address: string;
}

export interface TokenBalance {
  token_address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  decimals: string;
  balance: string;
}

export type MoralisChainOptions =
  | 'eth'
  | '0x1'
  | 'ropsten'
  | '0x3'
  | 'rinkeby'
  | '0x4'
  | 'goerli'
  | '0x5'
  | 'kovan'
  | '0x2a'
  | 'polygon'
  | '0x89'
  | 'mumbai'
  | '0x13881'
  | 'bsc'
  | '0x38'
  | 'bsc testnet'
  | '0x61'
  | 'avalanche'
  | '0xa86a'
  | 'avalanche testnet'
  | '0xa869'
  | 'fantom'
  | '0xfa'
  | undefined;

export const useWalletBalance = (
  address: string,
  chain: MoralisChainOptions
): WalletBalance[] | null | undefined => {
  const { account, token } = useMoralisWeb3Api();
  const { isInitialized } = useMoralis();

  const [assets, setAssets] = useState<WalletBalance[] | null | undefined>(undefined);

  useEffect(() => {
    if (isInitialized) {
      getTokenBalances().then((balance) => setAssets(balance));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const getTokenPrice = async (
    inputToken: TokenBalance,
    chain: MoralisChainOptions
  ): Promise<number | null> => {
    // slow down API call rate.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    console.log('Fetching price data for: ' + inputToken.name);
    const price: number | null = await token
      .getTokenPrice({ address: inputToken.token_address, chain: chain })
      .then((token) => token.usdPrice)
      .catch((err) => {
        console.log(err);
        return null;
      });
    return price;
  };

  const getTokenBalances = async (): Promise<WalletBalance[] | null> => {
    // fetch token balance from address
    const tokens: TokenBalance[] | null = await account
      .getTokenBalances({ address: address, chain: chain })
      .catch((err) => {
        console.log(err);
        return null;
      });
    console.log('Fetched all ERC20 balances for chain: ' + chain);

    // create Map() to store token balances, populate with info from API call.
    const tokenBalances: Map<String, WalletBalance> = new Map();
    for (const token of tokens!) {
      const tokenInfo: WalletBalance = {
        name: token.name,
        symbol: token.symbol,
        balance: parseFloat(token.balance) * Math.pow(10, -1 * parseFloat(token.decimals)),
        price: undefined,
        value: undefined,
        token_address: token.token_address,
      };
      tokenBalances.set(token.token_address, tokenInfo);
    }

    // attempt to get price data for each token
    for (const token of tokens!) {
      const price: number | null = await getTokenPrice(token, chain);
      try {
        const tokenInfo: WalletBalance | undefined = tokenBalances.get(token.token_address);
        if (tokenInfo && price) {
          tokenInfo!.price = price;
          tokenInfo!.value = tokenInfo.price * tokenInfo.balance;
          tokenBalances.set(token.token_address, tokenInfo);
        }
      } catch (error) {
        console.log(error);
      }
    }

    return Array.from(tokenBalances.values());
  };

  return assets;
};