import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
import { v1 } from "moos-api";
import fetch, { fileFromSync } from "node-fetch";
import readline from "readline";
import { createCollection, createEpisode, createFile, createSeason, createSource, deleteFile, fetchProfile } from "./api.js";
import type * as CDNTypes from "./cdn-types.js";

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
  if (!existsSync(path) || !existsSync(`${path}/media`)) {
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
        if (handlePlaylist !== "y" && handlePlaylist !== "Y" && handlePlaylist !== "a" && handlePlaylist !== "A") {
          continue;
        } else if (handlePlaylist === "a" || handlePlaylist === "A") {
          acceptAll = true;
        }
      }
      console.log("Delay");
      await new Promise((resolve, reject) => setTimeout(resolve, 3000));
      try {
        const playlist: CDNTypes.PlaylistJson = JSON.parse(readFileSync(`${path}/playlists/${playlists.dictionary[playlistPreview.key]}`, "utf8"));
        const collection = await createCollection({
          name: playlist.name,
          visibility: "unlisted",
          thumbnail: thumbnails[playlist.key] ? await uploadFile(`${path}/thumbnails/${thumbnails[playlist.key]}`, `${playlist.name}.jpg`) : undefined
        });
        if (!collection) {
          throw new Error("Collection creation failed");
        }
        console.log(collection);
        const seasons: v1.Season[] = [];
        for (const season of playlist.seasons) {
          if (!seasons[season.index]) {
            const newSeason = await createSeason({
              groupId: collection?.id,
              index: season.index
            });
            if (!newSeason) {
              throw new Error("Season creation failed");
            }
            seasons[season.index] = newSeason;
          }
        }
        const episodes: { [key: string]: v1.Episode } = {};
        for (const season of playlist.seasons) {
          for (const episode of season.episodes) {
            if (!seasons[season.index].episodes.map((episodeId) => episodes[episodeId]).find((e) => e.index === episode.index)) {
              const newEpisode = await createEpisode({
                index: episode.index,
                name: episode.name,
                seasonId: seasons[season.index].id
              });
              if (!newEpisode) {
                console.error(`Episode creation failed, ${season.index},${episode.index}:${episode.name}`);
                continue;
              }
              episodes[newEpisode.id] = newEpisode;
              seasons[season.index].episodes.push(newEpisode.id);
            }
            const fetchedEpisode = seasons[season.index].episodes.map((episodeId) => episodes[episodeId]).find((e) => e.index === episode.index);
            if (!fetchedEpisode) {
              console.error(`Episode disappeared, ${season.index},${episode.index}:${episode.name}`);
              continue;
            }
            try {
              const sourceFile = await uploadFile(
                `${path}/media/${playlist.dictionary[episode.key]}`,
                `${playlist.name} S${season.index} ${episode.name}.mp4`
              );
              const source = await createSource({
                episodeId: fetchedEpisode.id,
                language: season.language.includes("-") ? languageIndexToEnum(season.language.split("-")[0]) : languageIndexToEnum(season.language),
                seasonId: seasons[season.index].id,
                subtitles: season.language.includes("-") ? languageIndexToEnum(season.language.split("-")[1]) : undefined,
                name: fetchedEpisode.name !== episode.name ? episode.name : undefined,
                key: sourceFile
              });
              if (!source) {
                try {
                  await deleteFile({ id: sourceFile });
                } catch (error) {
                  console.error(error);
                }
                console.error(`Source creation failed, ${season.index},${episode.index}:${episode.name}`);
                continue;
              }
              fetchedEpisode.sources.push(source);
            } catch (error) {
              console.error(error);
              console.error(`Source Upload failed, ${season.index},${episode.index}:${episode.name}`);
            }
          }
        }
        console.log(seasons);
        console.log(episodes);
      } catch (error) {
        console.error(error);
        console.error(`Failed to process ${playlistPreview.name}`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function languageIndexToEnum(language: string): v1.Language {
  return `${language}` === "0"
    ? "de_DE"
    : `${language}` === "1"
    ? "ja_JP"
    : `${language}` === "2"
    ? "en_EN"
    : `${language}` === "3"
    ? "zh_CN"
    : "en_EN";
}

async function uploadFile(filePath: string, fileName: string): Promise<string> {
  const target = await createFile({
    name: `.eiswald/${fileName}`
  });
  if (!target) {
    throw new Error(`Failed to create File for ${filePath}`);
  }
  console.log(`${target.id}, ${target.url}, ${target.ttl}`);
  const file = fileFromSync(filePath);
  console.log(`Uploading ${fileName}`);
  const response = await fetch(target.url, {
    method: "PUT",
    body: file
  });
  if (!response.ok) {
    try {
      await deleteFile({ id: target.id });
    } catch (error) {
      console.error(error);
    }
    throw new Error(`Failed to upload ${filePath}: ${response.statusText}`);
  }
  return target.id;
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
