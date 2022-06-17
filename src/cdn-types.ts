export type PlaylistsJson = {
  playlists: PlaylistPreview[];
  dictionary: Dictionary;
};

export type PlaylistPreview = {
  name: string;
  key: string;
  scope: string;
};

export type ThumbnailsJson = {
  [key: string]: string;
};

export type PlaylistJson = {
  name: string;
  key: string;
  seasons: Season[];
  dictionary: Dictionary;
};

export type Season = {
  name: string;
  index: number;
  language: string;
  episodes: Episode[];
};

export type Episode = {
  name: string;
  index: number;
  available: boolean;
  key: string;
};

export type Dictionary = {
  [key: string]: string;
};
