import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getGroupMemberByUser } from '@/services/groupMemberService';
import { loadSession, saveSession } from '@/services/sessionService';

type ActiveGroupState = {
  groupId: string;
  groupName: string;
  memberId: string;
  memberName: string;
};

type ActiveGroupUpdate = Partial<ActiveGroupState>;

type ActiveGroupContextValue = ActiveGroupState & {
  isReady: boolean;
  isResolvingMember: boolean;
  hasActiveGroup: boolean;
  hasActiveMember: boolean;
  setActiveGroup: (update: ActiveGroupUpdate) => Promise<void>;
  clearActiveGroup: () => Promise<void>;
};

const DEFAULT_STATE: ActiveGroupState = {
  groupId: '',
  groupName: '',
  memberId: '',
  memberName: '',
};

const ActiveGroupContext = createContext<ActiveGroupContextValue | undefined>(undefined);

function didGroupChange(update: ActiveGroupUpdate, previousGroupId: string): boolean {
  if (typeof update.groupId === 'undefined') {
    return false;
  }

  return update.groupId !== previousGroupId;
}

export function ActiveGroupProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ActiveGroupState>(DEFAULT_STATE);
  const [isReady, setIsReady] = useState(false);
  const [isResolvingMember, setIsResolvingMember] = useState(false);

  const setActiveGroup = useCallback(async (update: ActiveGroupUpdate) => {
    if (Object.keys(update).length === 0) {
      return;
    }

    const session = await loadSession();
    const groupChanged = didGroupChange(update, session?.groupId ?? '');

    const nextState: ActiveGroupState = {
      groupId: update.groupId ?? session?.groupId ?? state.groupId,
      groupName: update.groupName ?? session?.groupName ?? state.groupName,
      memberId: groupChanged
        ? update.memberId ?? ''
        : update.memberId ?? session?.memberId ?? state.memberId,
      memberName: groupChanged
        ? update.memberName ?? ''
        : update.memberName ?? session?.memberName ?? state.memberName,
    };

    setState(nextState);
    if (!session) {
      return;
    }

    const nextSession = {
      ...session,
      groupId: nextState.groupId || undefined,
      groupName: nextState.groupName || undefined,
      memberId: nextState.memberId || undefined,
      memberName: nextState.memberName || undefined,
    };

    await saveSession(nextSession);
  }, [state.groupId, state.groupName, state.memberId, state.memberName]);

  const clearActiveGroup = useCallback(async () => {
    setState(DEFAULT_STATE);

    const session = await loadSession();
    if (!session) {
      return;
    }

    await saveSession({
      ...session,
      groupId: undefined,
      groupName: undefined,
      memberId: undefined,
      memberName: undefined,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSession() {
      const session = await loadSession();
      if (cancelled) {
        return;
      }

      if (session) {
        setState({
          groupId: session.groupId ?? '',
          groupName: session.groupName ?? '',
          memberId: session.memberId ?? '',
          memberName: session.memberName ?? '',
        });
      }

      setIsReady(true);
    }

    hydrateFromSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveMemberIfMissing() {
      if (!state.groupId || state.memberId) {
        setIsResolvingMember(false);
        return;
      }

      const session = await loadSession();
      if (!session?.userId) {
        setIsResolvingMember(false);
        return;
      }

      setIsResolvingMember(true);

      try {
        const response = await getGroupMemberByUser(state.groupId, session.userId);
        if (cancelled || !response.memberId) {
          setIsResolvingMember(false);
          return;
        }

        await setActiveGroup({
          memberId: response.memberId,
          memberName: response.displayName ?? state.memberName,
        });
      } catch {
        // Keep existing state if member lookup fails; screen-level errors will surface as needed.
      } finally {
        if (!cancelled) {
          setIsResolvingMember(false);
        }
      }
    }

    void resolveMemberIfMissing();

    return () => {
      cancelled = true;
    };
  }, [state.groupId, state.memberId, state.memberName, setActiveGroup]);

  const value = useMemo(
    () => ({
      ...state,
      isReady,
      isResolvingMember,
      hasActiveGroup: state.groupId.length > 0,
      hasActiveMember: state.memberId.length > 0,
      setActiveGroup,
      clearActiveGroup,
    }),
    [state, isReady, isResolvingMember, setActiveGroup, clearActiveGroup]
  );

  return <ActiveGroupContext.Provider value={value}>{children}</ActiveGroupContext.Provider>;
}

export function useActiveGroupContext(): ActiveGroupContextValue {
  const context = useContext(ActiveGroupContext);
  if (!context) {
    throw new Error('useActiveGroupContext must be used within ActiveGroupProvider');
  }

  return context;
}
