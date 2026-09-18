/**
 * useSocial — news feed social interactions: reactions and comments.
 *
 * Owns: STORAGE_KEY_POST_REACTIONS, STORAGE_KEY_POST_COMMENTS
 * Every mutator requires the acting user so ownership rules
 * (one reaction per user, delete own comment only) live in one place.
 */

import { PostReaction, PostComment, PostReactionType, User } from '../types';
import {
  STORAGE_KEY_POST_REACTIONS,
  STORAGE_KEY_POST_COMMENTS,
} from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export function useSocial(user: User | null) {
  const [postReactions, setPostReactions] = usePersistentState<PostReaction[]>(
    STORAGE_KEY_POST_REACTIONS,
    []
  );
  const [postComments, setPostComments] = usePersistentState<PostComment[]>(
    STORAGE_KEY_POST_COMMENTS,
    []
  );

  // Toggle: tap the same emoji again to remove, tap another to switch.
  // One reaction per user per post (re-tapping a different type replaces).
  const toggleReaction = (postId: string, type: PostReactionType) => {
    if (!user) return;
    setPostReactions(prev => {
      const existing = prev.find(r => r.postId === postId && r.userId === user.id);
      if (existing && existing.type === type) {
        return prev.filter(r => !(r.postId === postId && r.userId === user.id));
      }
      if (existing) {
        return prev.map(r => (r.postId === postId && r.userId === user.id) ? { ...r, type } : r);
      }
      const reaction: PostReaction = {
        id: `pr-${crypto.randomUUID()}`,
        postId,
        userId: user.id,
        userName: user.name,
        type,
        createdAt: new Date().toISOString(),
      };
      return [reaction, ...prev];
    });
  };

  const addComment = (postId: string, content: string) => {
    if (!user || !content.trim()) return;
    const comment: PostComment = {
      id: `pc-${crypto.randomUUID()}`,
      postId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setPostComments(prev => [...prev, comment]);
  };

  // A user may delete only their own comment
  const deleteComment = (commentId: string) => {
    if (!user) return;
    setPostComments(prev => prev.filter(c => !(c.id === commentId && c.userId === user.id)));
  };

  return { postReactions, postComments, toggleReaction, addComment, deleteComment };
}
