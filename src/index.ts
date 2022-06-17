import type * as CDNTypes from "./cdn-types.js";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import readline from "readline";
import { fetchProfile } from "./api.js";

dotenv.config();

const input = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = async (question: string): Promise<string> => {
  return new Promise((resolve, _reject) => {
    input.question(question, resolve);
  });
};

async function start() {
  const path = await question("Path: ");
  if (!existsSync(path)) {
    console.error("Path does not exist");
    return;
  }
  const playlists: CDNTypes.PlaylistsJson = JSON.parse(readFileSync(`${path}/playlists.json`, "utf8"));
  const thumbnails: CDNTypes.ThumbnailsJson = JSON.parse(readFileSync(`${path}/thumbnails.json`, "utf8"));
  try {
    await fetchProfile();
    let acceptAll = false;
    for (const playlistPreview of playlists.playlists) {
      if (!acceptAll) {
        const handlePlaylist = await question(`Process ${playlistPreview.name}? (y/n/a) `);
        if (handlePlaylist !== "y" && handlePlaylist !== "a") {
          return;
        } else if (handlePlaylist === "a") {
          acceptAll = true;
        }
      }
      try {
        const playlist: CDNTypes.PlaylistJson = JSON.parse(readFileSync(`${path}/playlists/${playlists.dictionary[playlistPreview.key]}`, "utf8"));
        //const thumbnailsForPlaylist:  = thumbnails[playlistPreview.key];
        console.log(fetch);

        console.log(playlist);
      } catch (error) {
        console.error(error);
        console.error(`Failed to process ${playlistPreview.name}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

start()
  .then(() => {
    input.close();
  })
  .catch((error) => {
    console.error(error);
    input.close();
    process.exitCode = 1;
  });
