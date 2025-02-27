// @flow

import * as React from 'react';
import LeaderboardContext from './LeaderboardContext';
import {
  type Leaderboard,
  type LeaderboardEntry,
  type LeaderboardExtremePlayerScore,
  type LeaderboardSortOption,
  type LeaderboardDisplayData,
  type LeaderboardUpdatePayload,
  createLeaderboard as doCreateLeaderboard,
  updateLeaderboard as doUpdateLeaderboard,
  resetLeaderboard as doResetLeaderboard,
  deleteLeaderboardEntry as doDeleteLeaderboardEntry,
  deleteLeaderboard as doDeleteLeaderboard,
  extractExtremeScoreDisplayData,
  extractEntryDisplayData,
  listLeaderboardEntries,
  listGameActiveLeaderboards,
} from '../Utils/GDevelopServices/Play';
import AuthenticatedUserContext from '../Profile/AuthenticatedUserContext';

type Props = {| gameId: string, children: React.Node |};

const pageSize = 10;

const shouldDisplayOnlyBestEntries = (leaderboard: Leaderboard) =>
  leaderboard.playerUnicityDisplayChoice === 'PREFER_UNIQUE';

type ReducerState = {|
  currentLeaderboardId: ?string,
  currentLeaderboard: ?Leaderboard,
  leaderboardsByIds: ?{| [string]: Leaderboard |},
  displayOnlyBestEntry: boolean,
  entries: ?Array<LeaderboardDisplayData>,
  mapPageIndexToUri: {| [number]: string |},
  pageIndex: number,
|};

type ReducerAction =
  | {| type: 'SET_LEADERBOARDS', payload: ?Array<Leaderboard> |}
  | {| type: 'SET_ENTRIES', payload: ?Array<LeaderboardDisplayData> |}
  | {| type: 'SET_NEXT_PAGE_URI', payload: string |}
  | {| type: 'SELECT_LEADERBOARD', payload: string |}
  | {| type: 'SET_PAGE_INDEX', payload: number |}
  | {| type: 'PURGE_NAVIGATION' |}
  | {| type: 'CHANGE_DISPLAY_ONLY_BEST_ENTRY', payload: boolean |}
  | {| type: 'UPDATE_OR_CREATE_LEADERBOARD', payload: Leaderboard |}
  | {| type: 'REMOVE_LEADERBOARD', payload: string |};

const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'SET_LEADERBOARDS':
      const leaderboards = action.payload;
      if (!leaderboards)
        return {
          ...state,
          leaderboardsByIds: null,
          currentLeaderboardId: null,
          currentLeaderboard: null,
        };

      const leaderboardsByIds = leaderboards.reduce((acc, leaderboard) => {
        acc[leaderboard.id] = leaderboard;
        return acc;
      }, {});
      const shouldDefineCurrentLeaderboardIfNoneSelected =
        !state.currentLeaderboard && leaderboards && leaderboards.length > 0;
      const primaryLeaderboard = leaderboards.find(
        leaderboard => leaderboard.primary
      );
      const newCurrentLeaderboard = shouldDefineCurrentLeaderboardIfNoneSelected
        ? primaryLeaderboard || leaderboards[0]
        : state.currentLeaderboard;
      return {
        ...state,
        leaderboardsByIds,
        displayOnlyBestEntry: newCurrentLeaderboard
          ? shouldDisplayOnlyBestEntries(newCurrentLeaderboard)
          : false,
        currentLeaderboardId: newCurrentLeaderboard
          ? newCurrentLeaderboard.id
          : null,
        currentLeaderboard: newCurrentLeaderboard,
      };
    case 'SET_ENTRIES':
      return {
        ...state,
        entries: action.payload,
      };
    case 'PURGE_NAVIGATION':
      return {
        ...state,
        entries: null,
        pageIndex: 0,
        mapPageIndexToUri: {},
      };
    case 'SET_NEXT_PAGE_URI':
      const nextPageIndex = state.pageIndex + 1;
      return {
        ...state,
        mapPageIndexToUri: {
          ...state.mapPageIndexToUri,
          [nextPageIndex]: action.payload,
        },
      };
    case 'SET_PAGE_INDEX':
      return {
        ...state,
        pageIndex: action.payload,
      };
    case 'SELECT_LEADERBOARD':
      if (!state.leaderboardsByIds) return state;
      const leaderboard = state.leaderboardsByIds[action.payload];
      return {
        ...state,
        displayOnlyBestEntry: shouldDisplayOnlyBestEntries(leaderboard),
        currentLeaderboardId: leaderboard.id,
        currentLeaderboard: leaderboard,
      };
    case 'CHANGE_DISPLAY_ONLY_BEST_ENTRY':
      return {
        ...state,
        displayOnlyBestEntry: action.payload,
      };
    case 'UPDATE_OR_CREATE_LEADERBOARD':
      const leaderboardsByIdsWithUpdatedPrimaryFlags = {};
      if (state.leaderboardsByIds) {
        Object.entries(state.leaderboardsByIds).forEach(
          ([leaderboardId, leaderboard]) => {
            leaderboardsByIdsWithUpdatedPrimaryFlags[leaderboardId] = {
              ...leaderboard,
              // $FlowFixMe: known error where Flow returns mixed for object value https://github.com/facebook/flow/issues/2221
              primary: action.payload.primary ? undefined : leaderboard.primary,
            };
          }
        );
      }
      leaderboardsByIdsWithUpdatedPrimaryFlags[action.payload.id] =
        action.payload;

      return {
        ...state,
        displayOnlyBestEntry: shouldDisplayOnlyBestEntries(action.payload),
        leaderboardsByIds: leaderboardsByIdsWithUpdatedPrimaryFlags,
        currentLeaderboardId: action.payload.id,
        currentLeaderboard: action.payload,
      };
    case 'REMOVE_LEADERBOARD':
      const newLeaderboardsByIds = { ...state.leaderboardsByIds };
      delete newLeaderboardsByIds[action.payload];
      const leaderboardsIds = Object.keys(newLeaderboardsByIds);
      if (leaderboardsIds.length === 0) {
        return {
          ...state,
          displayOnlyBestEntry: false,
          leaderboardsByIds: newLeaderboardsByIds,
          currentLeaderboard: null,
          currentLeaderboardId: null,
        };
      }
      return {
        ...state,
        displayOnlyBestEntry: shouldDisplayOnlyBestEntries(
          newLeaderboardsByIds[leaderboardsIds[0]]
        ),
        leaderboardsByIds: newLeaderboardsByIds,
        currentLeaderboard: newLeaderboardsByIds[leaderboardsIds[0]],
        currentLeaderboardId: leaderboardsIds[0],
      };
    default: {
      return { ...state };
    }
  }
};

const LeaderboardProvider = ({ gameId, children }: Props) => {
  const authenticatedUser = React.useContext(AuthenticatedUserContext);
  // Ensure that only one request for leaderboards list is sent at the same time.
  const isListingLeaderboards = React.useRef(false);

  const [
    {
      currentLeaderboardId,
      currentLeaderboard,
      leaderboardsByIds,
      displayOnlyBestEntry,
      entries,
      mapPageIndexToUri,
      pageIndex,
    },
    dispatch,
  ] = React.useReducer<ReducerState, ReducerAction>(reducer, {
    currentLeaderboardId: null,
    currentLeaderboard: null,
    leaderboardsByIds: null,
    displayOnlyBestEntry: false,
    entries: null,
    mapPageIndexToUri: {},
    pageIndex: 0,
  });

  const listLeaderboards = React.useCallback(
    async () => {
      if (!isListingLeaderboards.current) {
        isListingLeaderboards.current = true;
        try {
          dispatch({ type: 'SET_LEADERBOARDS', payload: null });
          const fetchedLeaderboards = await listGameActiveLeaderboards(
            authenticatedUser,
            gameId
          );
          if (!fetchedLeaderboards) return;
          fetchedLeaderboards.sort((a, b) => a.name.localeCompare(b.name));
          dispatch({
            type: 'SET_LEADERBOARDS',
            payload: fetchedLeaderboards,
          });
        } finally {
          isListingLeaderboards.current = false;
        }
      }
    },
    [gameId, authenticatedUser]
  );

  const createLeaderboard = React.useCallback(
    async (creationPayload: {|
      name: string,
      sort: LeaderboardSortOption,
    |}) => {
      dispatch({ type: 'SET_ENTRIES', payload: null });
      const newLeaderboard = await doCreateLeaderboard(
        authenticatedUser,
        gameId,
        creationPayload
      );
      if (!newLeaderboard) return;

      dispatch({
        type: 'UPDATE_OR_CREATE_LEADERBOARD',
        payload: newLeaderboard,
      });
    },
    [gameId, authenticatedUser]
  );

  const fetchEntries = React.useCallback(
    async (options?: {| uri?: ?string |}) => {
      if (!currentLeaderboardId) return;

      const uriToUse = options && options.uri ? options.uri : null;

      dispatch({ type: 'SET_ENTRIES', payload: null });
      const data = await listLeaderboardEntries(gameId, currentLeaderboardId, {
        pageSize,
        onlyBestEntry: displayOnlyBestEntry,
        forceUri: uriToUse,
      });
      if (!data) return;
      const fetchedEntries:
        | LeaderboardEntry[]
        | LeaderboardExtremePlayerScore[] = data.entries;

      if (data.nextPageUri) {
        dispatch({ type: 'SET_NEXT_PAGE_URI', payload: data.nextPageUri });
      }

      let entriesToDisplay: LeaderboardDisplayData[] = [];
      if (displayOnlyBestEntry) {
        entriesToDisplay = fetchedEntries.map(entry =>
          // $FlowFixMe
          extractExtremeScoreDisplayData(entry)
        );
      } else {
        entriesToDisplay = fetchedEntries.map(entry =>
          // $FlowFixMe
          extractEntryDisplayData(entry)
        );
      }
      dispatch({ type: 'SET_ENTRIES', payload: entriesToDisplay });
    },
    [currentLeaderboardId, displayOnlyBestEntry, gameId]
  );

  const selectLeaderboard = React.useCallback((leaderboardId: string) => {
    dispatch({ type: 'SELECT_LEADERBOARD', payload: leaderboardId });
  }, []);

  const setDisplayOnlyBestEntry = React.useCallback((newValue: boolean) => {
    dispatch({ type: 'CHANGE_DISPLAY_ONLY_BEST_ENTRY', payload: newValue });
  }, []);

  const updateLeaderboard = async (attributes: LeaderboardUpdatePayload) => {
    if (!currentLeaderboardId) return;
    if (attributes.sort) dispatch({ type: 'PURGE_NAVIGATION' }); // When changing playerUnicityDisplayChoice, it will change the displayOnlyBestEntry state variable, which will purge navigation.
    const updatedLeaderboard = await doUpdateLeaderboard(
      authenticatedUser,
      gameId,
      currentLeaderboardId,
      attributes
    );
    if (!updatedLeaderboard) return;

    dispatch({
      type: 'UPDATE_OR_CREATE_LEADERBOARD',
      payload: updatedLeaderboard,
    });

    if (attributes.sort) await fetchEntries();
  };

  const resetLeaderboard = async () => {
    if (!currentLeaderboardId) return;
    dispatch({ type: 'PURGE_NAVIGATION' });
    const updatedLeaderboard = await doResetLeaderboard(
      authenticatedUser,
      gameId,
      currentLeaderboardId
    );
    if (!updatedLeaderboard) return;

    dispatch({
      type: 'UPDATE_OR_CREATE_LEADERBOARD',
      payload: updatedLeaderboard,
    });
    fetchEntries();
  };

  const deleteLeaderboard = async () => {
    if (!currentLeaderboardId || !leaderboardsByIds) return;
    dispatch({ type: 'PURGE_NAVIGATION' });
    await doDeleteLeaderboard(authenticatedUser, gameId, currentLeaderboardId);
    dispatch({ type: 'REMOVE_LEADERBOARD', payload: currentLeaderboardId });
  };

  const deleteLeaderboardEntry = async (entryId: string) => {
    if (!currentLeaderboardId) return;
    await doDeleteLeaderboardEntry(
      authenticatedUser,
      gameId,
      currentLeaderboardId,
      entryId
    );
    fetchEntries({ uri: pageIndex > 0 ? mapPageIndexToUri[pageIndex] : null });
  };

  // --- Navigation ---

  const navigateToNextPage = React.useCallback(
    async () => {
      const nextPageUri = mapPageIndexToUri[pageIndex + 1];
      if (!nextPageUri) return;
      dispatch({ type: 'SET_PAGE_INDEX', payload: pageIndex + 1 });
      await fetchEntries({ uri: nextPageUri });
    },
    [fetchEntries, mapPageIndexToUri, pageIndex]
  );

  const navigateToPreviousPage = React.useCallback(
    async () => {
      if (pageIndex === 1) {
        dispatch({ type: 'SET_PAGE_INDEX', payload: 0 });
        await fetchEntries();
      } else {
        const previousPageUri = mapPageIndexToUri[pageIndex - 1];
        if (!previousPageUri) return;
        dispatch({ type: 'SET_PAGE_INDEX', payload: pageIndex - 1 });
        await fetchEntries({ uri: previousPageUri });
      }
    },
    [fetchEntries, mapPageIndexToUri, pageIndex]
  );

  const navigateToFirstPage = React.useCallback(
    async () => {
      dispatch({ type: 'SET_PAGE_INDEX', payload: 0 });
      await fetchEntries();
    },
    [fetchEntries]
  );

  // --- Effects ---

  React.useEffect(
    () => {
      dispatch({ type: 'SET_LEADERBOARDS', payload: null });
      dispatch({ type: 'PURGE_NAVIGATION' });
    },
    [gameId]
  );

  React.useEffect(
    () => {
      if (!currentLeaderboardId) return;
      dispatch({ type: 'PURGE_NAVIGATION' });
      fetchEntries();
    },
    [currentLeaderboardId, displayOnlyBestEntry, fetchEntries]
  );

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboards: !!leaderboardsByIds
          ? // $FlowFixMe
            Object.values(leaderboardsByIds)
          : null,
        currentLeaderboard,
        displayOnlyBestEntry,
        browsing: {
          entries,
          goToNextPage: !!mapPageIndexToUri[pageIndex + 1]
            ? navigateToNextPage
            : null,
          goToPreviousPage:
            pageIndex === 1 || !!mapPageIndexToUri[pageIndex - 1]
              ? navigateToPreviousPage
              : null,
          goToFirstPage: pageIndex === 0 ? null : navigateToFirstPage,
        },
        setDisplayOnlyBestEntry,
        createLeaderboard,
        listLeaderboards,
        selectLeaderboard,
        updateLeaderboard,
        resetLeaderboard,
        deleteLeaderboard,
        deleteLeaderboardEntry,
        fetchLeaderboardEntries: fetchEntries,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
};

export default LeaderboardProvider;
