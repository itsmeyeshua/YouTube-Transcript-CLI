# YouTube Transcript CLI

Fetch the transcript of any YouTube video right in your terminal — with optional language selection, time range filtering, and automatic clipboard copy.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Make the script executable
chmod +x transcript.js

# 3. (Optional) Use it anywhere — symlink or alias
ln -s "$(pwd)/transcript.js" /usr/local/bin/transcript
```

---

## Usage

```
./transcript.js [LINK] [LANG] [FROM] [TO] [--no-timestamps|-nt]
```

| Argument | Description | Default |
|----------|-------------|---------|
| `LINK` | YouTube URL or bare video ID | *(required)* |
| `LANG` | Language code: `en`, `ar`, `fr`, `es`, `de`, `ja`… | `en` |
| `FROM` | Start time (see formats below) | beginning |
| `TO` | End time (see formats below) | end |
| `--no-timestamps`, `-nt` | Disable timestamps in output | timestamps enabled |

### Time formats

All of these are valid:

```
90          →  90 seconds
1:30        →  1 min 30 sec
0:15:10     →  15 min 10 sec
01:22:00    →  1 hr 22 min
1:22:0      →  1 hr 22 min  (leading zeros optional)
```

---

## Examples

```bash
# Full transcript in English
./transcript.js https://youtu.be/VIDEO_ID

# French transcript
./transcript.js https://youtu.be/VIDEO_ID fr

# English, from 1:30 to 3:00
./transcript.js https://youtu.be/VIDEO_ID en 1:30 3:00

# Arabic, full video (youtube.com long URL)
./transcript.js https://www.youtube.com/watch?v=VIDEO_ID ar

# Bare video ID, specific time window
./transcript.js VIDEO_ID en 00:15:10 01:22:00

# Seconds-only time
./transcript.js VIDEO_ID en 0 90

# timestamps ON by default
./transcript.js https://youtu.be/VIDEO_ID en 1:30 3:00

# timestamps OFF — long form
./transcript.js https://youtu.be/VIDEO_ID en 1:30 3:00 --no-timestamps

# timestamps OFF — shorthand
./transcript.js https://youtu.be/VIDEO_ID en 1:30 3:00 -nt
```

---

## Features

- Supports all YouTube URL formats (`youtu.be`, `youtube.com/watch`, `/shorts/`, `/embed/`) and bare video IDs  
- Flexible time format (`0`, `1:30`, `00:15:10`, `1:22:0`)  
- Automatic language fallback to English if requested language is unavailable  
- Copies transcript to clipboard automatically (skips gracefully in SSH/headless environments)  
- Colorized terminal output with timestamps  

---

## Requirements

- Node.js 16+
- The video must have captions enabled on YouTube
