/**
 * On-Demand Google Drive Streaming & Download Store.
 * Manages personal cloud downloads, Google Drive file IDs, and cloud playback.
 */

export interface OnDemandItem {
  id: string; // IMDb or TMDb ID or slug
  title: string;
  media_type: "movie" | "tv";
  year?: number;
  poster?: string;
  backdrop?: string;
  plot_overview?: string;
  // Google Drive Cloud Details
  driveFileId?: string; // Google Drive file ID (e.g. 1a2b3c4d...)
  driveViewUrl?: string; // Direct drive link
  driveStreamUrl?: string; // Direct streamable download/preview URL
  fileSizeBytes?: number;
  quality?: "1080p" | "720p" | "4K";
  folderPath?: string;
  status: "idle" | "downloading" | "uploading_drive" | "ready" | "error";
  progressPercent: number; // 0 to 100
  downloadSpeed?: string;
  requestedAt?: number;
  completedAt?: number;
  season?: number;
  episode?: number;
}

export interface GoogleDriveConfig {
  connected: boolean;
  folderName: string;
  folderId?: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

// Sample pre-configured cloud titles with valid public Google Drive / cloud preview links
const INITIAL_ONDEMAND_LIBRARY: OnDemandItem[] = [
  {
    id: "tt0137523",
    title: "Fight Club",
    media_type: "movie",
    year: 1999,
    poster: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
    plot_overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.",
    driveFileId: "1ZpW8B6C7w2eQ_example_fight_club",
    driveViewUrl: "https://drive.google.com/file/d/1B6C7w2eQ_sample/view",
    driveStreamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    fileSizeBytes: 2411724800, // 2.4 GB
    quality: "1080p",
    folderPath: "FilmFlix On-Demand/Movies/",
    status: "ready",
    progressPercent: 100,
  },
  {
    id: "tt1375666",
    title: "Inception",
    media_type: "movie",
    year: 2010,
    poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
    plot_overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life.",
    driveFileId: "1X9A3c7v2eQ_example_inception",
    driveViewUrl: "https://drive.google.com/file/d/1X9A3c7v2eQ_sample/view",
    driveStreamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    fileSizeBytes: 2899102976, // 2.9 GB
    quality: "1080p",
    folderPath: "FilmFlix On-Demand/Movies/",
    status: "ready",
    progressPercent: 100,
  },
  {
    id: "tt0903747",
    title: "Breaking Bad",
    media_type: "tv",
    year: 2008,
    poster: "https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/9faGSFi5jam6pDWGNdcu8f8L1g5.jpg",
    plot_overview: "Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and decides to enter the dangerous world of drugs.",
    driveFileId: "1W7B4d8c3eQ_example_bb_s01e01",
    driveViewUrl: "https://drive.google.com/file/d/1W7B4d8c3eQ_sample/view",
    driveStreamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    fileSizeBytes: 1240000000, // 1.2 GB
    quality: "1080p",
    folderPath: "FilmFlix On-Demand/TV Shows/Breaking Bad/Season 01/",
    status: "ready",
    progressPercent: 100,
    season: 1,
    episode: 1,
  },
];

// In-memory store attached to globalThis
const globalStore = globalThis as unknown as {
  __onDemandLibrary?: Map<string, OnDemandItem>;
  __googleDriveConfig?: GoogleDriveConfig;
};

if (!globalStore.__onDemandLibrary) {
  globalStore.__onDemandLibrary = new Map<string, OnDemandItem>();
  for (const item of INITIAL_ONDEMAND_LIBRARY) {
    globalStore.__onDemandLibrary.set(getItemKey(item.id, item.season, item.episode), item);
  }
}

if (!globalStore.__googleDriveConfig) {
  globalStore.__googleDriveConfig = {
    connected: true,
    folderName: "FilmFlix On-Demand",
    folderId: "1a8B9C0D_filmflix_cloud_root",
    storageUsedBytes: 6550827776, // ~6.5 GB
    storageLimitBytes: 107374182400, // 100 GB
  };
}

export function getItemKey(id: string, season?: number, episode?: number): string {
  if (season !== undefined && episode !== undefined) {
    return `${id}-S${season}E${episode}`;
  }
  return id;
}

export function getAllOnDemandItems(): OnDemandItem[] {
  return Array.from(globalStore.__onDemandLibrary!.values());
}

export function getOnDemandItem(id: string, season?: number, episode?: number): OnDemandItem | undefined {
  const key = getItemKey(id, season, episode);
  return globalStore.__onDemandLibrary!.get(key) || globalStore.__onDemandLibrary!.get(id);
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  return globalStore.__googleDriveConfig!;
}

export function updateGoogleDriveConfig(updates: Partial<GoogleDriveConfig>): GoogleDriveConfig {
  Object.assign(globalStore.__googleDriveConfig!, updates);
  return globalStore.__googleDriveConfig!;
}

/**
 * Initiates an On-Demand download to Google Drive.
 * Simulates real-time downloading and cloud upload with realistic progress steps.
 */
export function requestOnDemandDownload(params: {
  id: string;
  title: string;
  media_type: "movie" | "tv";
  year?: number;
  poster?: string;
  backdrop?: string;
  plot_overview?: string;
  season?: number;
  episode?: number;
  quality?: "1080p" | "720p" | "4K";
}): OnDemandItem {
  const key = getItemKey(params.id, params.season, params.episode);
  const existing = globalStore.__onDemandLibrary!.get(key);

  if (existing && existing.status === "ready") {
    return existing;
  }

  const quality = params.quality || "1080p";
  const estimatedBytes =
    quality === "4K"
      ? 5800000000
      : quality === "720p"
      ? 1100000000
      : 2200000000;

  const item: OnDemandItem = {
    id: params.id,
    title: params.title,
    media_type: params.media_type,
    year: params.year,
    poster: params.poster,
    backdrop: params.backdrop,
    plot_overview: params.plot_overview,
    season: params.season,
    episode: params.episode,
    quality,
    fileSizeBytes: estimatedBytes,
    folderPath: `FilmFlix On-Demand/${params.media_type === "tv" ? "TV Shows" : "Movies"}/${params.title}/`,
    status: "downloading",
    progressPercent: 5,
    downloadSpeed: "42.5 MB/s",
    requestedAt: Date.now(),
  };

  globalStore.__onDemandLibrary!.set(key, item);

  // Run progress simulation in background
  simulateDownloadLifecycle(key);

  return item;
}

function simulateDownloadLifecycle(key: string) {
  let progress = 5;

  const timer = setInterval(() => {
    const item = globalStore.__onDemandLibrary!.get(key);
    if (!item) {
      clearInterval(timer);
      return;
    }

    progress += Math.floor(Math.random() * 12) + 8;

    if (progress < 60) {
      item.status = "downloading";
      item.progressPercent = progress;
      item.downloadSpeed = `${(Math.random() * 15 + 35).toFixed(1)} MB/s`;
    } else if (progress < 95) {
      item.status = "uploading_drive";
      item.progressPercent = progress;
      item.downloadSpeed = `Syncing to Google Drive (${(Math.random() * 20 + 40).toFixed(1)} MB/s)`;
    } else {
      // Completed!
      item.status = "ready";
      item.progressPercent = 100;
      item.completedAt = Date.now();
      item.driveFileId = `1gDrive_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      item.driveViewUrl = `https://drive.google.com/file/d/${item.driveFileId}/view`;
      // Direct high-speed video stream sample for smooth playback demonstration
      item.driveStreamUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

      // Update storage used
      if (globalStore.__googleDriveConfig) {
        globalStore.__googleDriveConfig.storageUsedBytes += item.fileSizeBytes || 2000000000;
      }

      clearInterval(timer);
    }
  }, 1200);
}
