// Copyright 2023 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { ReadonlyDeep } from 'type-fest';
import type { ThunkAction } from 'redux-thunk';
import type { StateType as RootStateType } from '../reducer';
import { clearCallHistoryDataAndSync } from '../../util/callDisposition';
import type { BoundActionCreatorsMapObject } from '../../hooks/useBoundActions';
import { useBoundActions } from '../../hooks/useBoundActions';
import type { ToastActionType } from './toast';
import { showToast } from './toast';
import { ToastType } from '../../types/Toast';
import type { CallHistoryDetails } from '../../types/CallDisposition';
import * as log from '../../logging/log';
import * as Errors from '../../types/errors';

export type CallHistoryState = ReadonlyDeep<{
  // This informs the app that underlying call history data has changed.
  edition: number;
  callHistoryByCallId: Record<string, CallHistoryDetails>;
}>;

const CALL_HISTORY_CACHE = 'callHistory/CACHE';
const CALL_HISTORY_RESET = 'callHistory/RESET';

export type CallHistoryCache = ReadonlyDeep<{
  type: typeof CALL_HISTORY_CACHE;
  payload: CallHistoryDetails;
}>;

export type CallHistoryReset = ReadonlyDeep<{
  type: typeof CALL_HISTORY_RESET;
}>;

export type CallHistoryAction = ReadonlyDeep<
  CallHistoryCache | CallHistoryReset
>;

export function getEmptyState(): CallHistoryState {
  return {
    edition: 0,
    callHistoryByCallId: {},
  };
}

function cacheCallHistory(callHistory: CallHistoryDetails): CallHistoryCache {
  return {
    type: CALL_HISTORY_CACHE,
    payload: callHistory,
  };
}

function clearAllCallHistory(): ThunkAction<
  void,
  RootStateType,
  unknown,
  CallHistoryReset | ToastActionType
> {
  return async dispatch => {
    try {
      await clearCallHistoryDataAndSync();
      dispatch(showToast({ toastType: ToastType.CallHistoryCleared }));
    } catch (error) {
      log.error('Error clearing call history', Errors.toLogFormat(error));
    } finally {
      // Just force a reset, even if the clear failed.
      dispatch({ type: CALL_HISTORY_RESET });
    }
  };
}

export const actions = {
  cacheCallHistory,
  clearAllCallHistory,
};

export const useCallHistoryActions = (): BoundActionCreatorsMapObject<
  typeof actions
> => useBoundActions(actions);

export function reducer(
  state: CallHistoryState = getEmptyState(),
  action: CallHistoryAction
): CallHistoryState {
  switch (action.type) {
    case CALL_HISTORY_RESET:
      return { ...state, edition: state.edition + 1, callHistoryByCallId: {} };
    case CALL_HISTORY_CACHE:
      return {
        ...state,
        callHistoryByCallId: {
          ...state.callHistoryByCallId,
          [action.payload.callId]: action.payload,
        },
      };
    default:
      return state;
  }
}
