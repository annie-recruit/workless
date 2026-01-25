'use client';

import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { nanoid } from 'nanoid';

export type FlagBookmark = {
  id: string;
  x: number;
  y: number;
  zoom: number;
  name: string;
  createdAt: string;
  lastAccessedAt?: string;
};

type BoardKey = string;

type FlagState = {
  flagsByBoardKey: Record<BoardKey, FlagBookmark[]>;
  selectedFlagIdByBoardKey: Record<BoardKey, string | null>;
  hoveredFlagIdByBoardKey: Record<BoardKey, string | null>;
};

type AddFlagInput = {
  x: number;
  y: number;
  zoom: number;
  name?: string;
};

type Action =
  | { type: 'ADD_FLAG'; boardKey: BoardKey; input: AddFlagInput }
  | { type: 'REMOVE_FLAG'; boardKey: BoardKey; id: string }
  | { type: 'SELECT_FLAG'; boardKey: BoardKey; id: string | null }
  | { type: 'HOVER_FLAG'; boardKey: BoardKey; id: string | null }
  | { type: 'TOUCH_FLAG'; boardKey: BoardKey; id: string };

const initialState: FlagState = {
  flagsByBoardKey: {},
  selectedFlagIdByBoardKey: {},
  hoveredFlagIdByBoardKey: {},
};

function reducer(state: FlagState, action: Action): FlagState {
  switch (action.type) {
    case 'ADD_FLAG': {
      const flags = state.flagsByBoardKey[action.boardKey] || [];
      const nextIndex = flags.length + 1;
      const now = new Date().toISOString();
      const next: FlagBookmark = {
        id: nanoid(),
        x: action.input.x,
        y: action.input.y,
        zoom: action.input.zoom,
        name: action.input.name?.trim() || `Flag ${nextIndex}`,
        createdAt: now,
      };
      return {
        ...state,
        flagsByBoardKey: {
          ...state.flagsByBoardKey,
          [action.boardKey]: [...flags, next],
        },
        selectedFlagIdByBoardKey: {
          ...state.selectedFlagIdByBoardKey,
          [action.boardKey]: next.id,
        },
      };
    }
    case 'REMOVE_FLAG': {
      const flags = state.flagsByBoardKey[action.boardKey] || [];
      const nextFlags = flags.filter((f) => f.id !== action.id);
      const selected = state.selectedFlagIdByBoardKey[action.boardKey] || null;
      const hovered = state.hoveredFlagIdByBoardKey[action.boardKey] || null;
      return {
        ...state,
        flagsByBoardKey: {
          ...state.flagsByBoardKey,
          [action.boardKey]: nextFlags,
        },
        selectedFlagIdByBoardKey: {
          ...state.selectedFlagIdByBoardKey,
          [action.boardKey]: selected === action.id ? null : selected,
        },
        hoveredFlagIdByBoardKey: {
          ...state.hoveredFlagIdByBoardKey,
          [action.boardKey]: hovered === action.id ? null : hovered,
        },
      };
    }
    case 'SELECT_FLAG':
      return {
        ...state,
        selectedFlagIdByBoardKey: {
          ...state.selectedFlagIdByBoardKey,
          [action.boardKey]: action.id,
        },
      };
    case 'HOVER_FLAG':
      return {
        ...state,
        hoveredFlagIdByBoardKey: {
          ...state.hoveredFlagIdByBoardKey,
          [action.boardKey]: action.id,
        },
      };
    case 'TOUCH_FLAG': {
      const flags = state.flagsByBoardKey[action.boardKey] || [];
      const now = new Date().toISOString();
      return {
        ...state,
        flagsByBoardKey: {
          ...state.flagsByBoardKey,
          [action.boardKey]: flags.map((f) =>
            f.id === action.id ? { ...f, lastAccessedAt: now } : f,
          ),
        },
      };
    }
    default:
      return state;
  }
}

type FlagStore = {
  getFlags: (boardKey: BoardKey) => FlagBookmark[];
  getSelectedFlagId: (boardKey: BoardKey) => string | null;
  getHoveredFlagId: (boardKey: BoardKey) => string | null;
  addFlag: (boardKey: BoardKey, input: AddFlagInput) => void;
  removeFlag: (boardKey: BoardKey, id: string) => void;
  selectFlag: (boardKey: BoardKey, id: string | null) => void;
  hoverFlag: (boardKey: BoardKey, id: string | null) => void;
  touchFlag: (boardKey: BoardKey, id: string) => void;
};

const FlagContext = createContext<FlagStore | null>(null);

export function FlagProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const store: FlagStore = useMemo(
    () => ({
      getFlags: (boardKey) => state.flagsByBoardKey[boardKey] || [],
      getSelectedFlagId: (boardKey) => state.selectedFlagIdByBoardKey[boardKey] || null,
      getHoveredFlagId: (boardKey) => state.hoveredFlagIdByBoardKey[boardKey] || null,
      addFlag: (boardKey, input) => dispatch({ type: 'ADD_FLAG', boardKey, input }),
      removeFlag: (boardKey, id) => dispatch({ type: 'REMOVE_FLAG', boardKey, id }),
      selectFlag: (boardKey, id) => dispatch({ type: 'SELECT_FLAG', boardKey, id }),
      hoverFlag: (boardKey, id) => dispatch({ type: 'HOVER_FLAG', boardKey, id }),
      touchFlag: (boardKey, id) => dispatch({ type: 'TOUCH_FLAG', boardKey, id }),
    }),
    [state],
  );

  return <FlagContext.Provider value={store}>{children}</FlagContext.Provider>;
}

export function useFlagsStore(): FlagStore {
  const ctx = useContext(FlagContext);
  if (!ctx) throw new Error('useFlagsStore must be used within FlagProvider');
  return ctx;
}

