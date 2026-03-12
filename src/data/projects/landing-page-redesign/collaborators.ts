import type { Collaborator } from '@/types/branch';

export const alice: Collaborator = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: '/catpfp.jpg',
  color: '#8B5CF6',
};

export const bob: Collaborator = {
  id: 'user_bob',
  name: 'Bob Tran',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=bob&backgroundColor=c0aede',
  color: '#06B6D4',
};

export const clara: Collaborator = {
  id: 'user_clara',
  name: 'Clara Sun',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=clara&backgroundColor=ffd5dc',
  color: '#EC4899',
};
