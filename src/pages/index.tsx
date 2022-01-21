import type { NextPage } from 'next';
import styles from './index.module.css';
import { WalletConnectButton } from '@/components';
import {
  identity as identityQuery,
  followStatus,
  Identity,
} from '@/utils/query';
import { useWeb3 } from '@/context/web3Context';
import { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import { isValidAddr } from '@/utils/helper';
import LoadingButton from '@mui/lab/LoadingButton';
import { formatAddress } from '@/utils';
import Avatar from '@mui/material/Avatar';

const NAME_SPACE = 'CyberConnect';
const NETWORK = 'ethereum';

const Home: NextPage = () => {
  const { connectWallet, address, ens, cyberConnect } = useWeb3();

  const [searchInput, setSearchInput] = useState<string>('');
  const [searchAddrFollowStatus, setSearchAddrFollowStatus] = useState<{
    isFollowing: Boolean;
    isFollowed: boolean;
  }>({
    isFollowed: false,
    isFollowing: false,
  });
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const fetchFollowStatus = useCallback(
    async (toAddr: string) => {
      const resp = await followStatus({
        fromAddr: address,
        toAddr,
        namespace: NAME_SPACE,
        network: NETWORK,
      });
      if (resp) {
        setSearchAddrFollowStatus(resp);
      }
    },
    [address]
  );

  const handleFollow = useCallback(async () => {
    if (!cyberConnect) {
      return;
    }

    setFollowLoading(true);

    if (!searchAddrFollowStatus.isFollowing) {
      await cyberConnect.connect(searchInput);
    } else {
      await cyberConnect.disconnect(searchInput);
    }

    setFollowLoading(false);
    fetchFollowStatus(searchInput);
  }, [cyberConnect, searchInput, searchAddrFollowStatus, fetchFollowStatus]);

  const handleInputChange = useCallback(
    async (value) => {
      setSearchInput(value);

      if (isValidAddr(value) && address) {
        setSearchLoading(true);
        await fetchFollowStatus(value);
      }
      setSearchLoading(false);
    },
    [address, fetchFollowStatus]
  );

  const initIdentity = useCallback(async () => {
    if (!address) {
      return;
    }

    const resp = await identityQuery({
      address,
      namespace: NAME_SPACE,
      network: NETWORK,
      followingFirst: 10,
      followerFirst: 10,
    });
    if (resp) {
      setIdentity(resp);
    }
  }, [address]);

  const fetchMore = useCallback(
    async (type: 'followings' | 'followers') => {
      if (!address || !identity) {
        return;
      }

      const params =
        type === 'followers'
          ? {
              address,
              namespace: NAME_SPACE,
              network: NETWORK,
              followerFirst: 10,
              followerAfter: identity.followers.pageInfo.endCursor,
            }
          : {
              address,
              namespace: NAME_SPACE,
              network: NETWORK,
              followingFirst: 10,
              followingAfter: identity.followings.pageInfo.endCursor,
            };

      const resp = await identityQuery(params);
      if (resp) {
        type === 'followers'
          ? setIdentity({
              ...identity,
              followers: {
                pageInfo: resp.followers.pageInfo,
                list: identity.followers.list.concat(resp.followers.list),
              },
            })
          : setIdentity({
              ...identity,
              followings: {
                pageInfo: resp.followings.pageInfo,
                list: identity.followings.list.concat(resp.followings.list),
              },
            });
      }
    },
    [address, identity]
  );

  useEffect(() => {
    initIdentity();
  }, [initIdentity]);

  return (
    <div className={styles.container}>
      <WalletConnectButton />
      <TextField onChange={(e) => handleInputChange(e.target.value)} />
      <LoadingButton
        onClick={handleFollow}
        disabled={searchLoading || !isValidAddr(searchInput) || !address}
        loading={followLoading}
      >
        {!searchAddrFollowStatus.isFollowing ? 'Follow' : 'Unfollow'}
      </LoadingButton>
      {isValidAddr(searchInput) && (
        <div>
          This user{' '}
          {searchAddrFollowStatus.isFollowed
            ? 'has followed you'
            : 'has not followed you'}
        </div>
      )}
      {identity && (
        <div>
          <div>
            <div>You have {identity.followerCount} followers</div>
            {identity.followers.list.map((user) => {
              return (
                <div key={user.address}>
                  <Avatar src={user.avatar} />
                  {user.ens || formatAddress(user.address)}
                </div>
              );
            })}
            {identity.followers.pageInfo.hasNextPage && (
              <LoadingButton onClick={() => fetchMore('followers')}>
                See More
              </LoadingButton>
            )}
          </div>
          <div>
            <div>You have {identity.followingCount} followings</div>
            {identity.followings.list.map((user) => {
              return (
                <div key={user.address}>
                  <Avatar src={user.avatar} />
                  {user.ens || formatAddress(user.address)}
                </div>
              );
            })}
            {identity.followings.pageInfo.hasNextPage && (
              <LoadingButton onClick={() => fetchMore('followings')}>
                See More
              </LoadingButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;