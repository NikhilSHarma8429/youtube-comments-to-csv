const { google } = require('googleapis');
require('dotenv').config();
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const API_KEY = process.env.API_KEY;
const VIDEO_ID = 'cXxmbemS6XM';

const youtube = google.youtube({
  version: 'v3',
  auth: API_KEY,
});

function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  return $.text();
}

async function fetchComments(videoId, maxComments = 1000) {
  let comments = [];
  let nextPageToken = '';
  
  try {
    while (comments.length < maxComments) {
      const response = await youtube.commentThreads.list({
        part: 'snippet',
        videoId: videoId,
        maxResults: 100,
        pageToken: nextPageToken,
      });

      const fetchedComments = response.data.items.map(item => {
        const comment = item.snippet.topLevelComment.snippet;
        return {
          text: extractTextFromHtml(comment.textDisplay),
          sentiment: 2, // Default sentiment value
        };
      });

      comments = comments.concat(fetchedComments);
      nextPageToken = response.data.nextPageToken;

      if (!nextPageToken || comments.length >= maxComments) {
        break;
      }
    }

    return comments.slice(0, maxComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

async function saveCommentsToCsv(comments, filePath) {
  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'text', title: 'Comment' },
      { id: 'sentiment', title: 'Sentiment' },
    ],
  });

  try {
    await csvWriter.writeRecords(comments);
    console.log(`Comments have been written to ${filePath}`);
  } catch (error) {
    console.error('Error writing to CSV file:', error.message);
  }
}

// Fetch comments and save to CSV
fetchComments(VIDEO_ID).then(comments => {
  saveCommentsToCsv(comments, 'comments.csv');
});
