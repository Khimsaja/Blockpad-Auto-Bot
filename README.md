# BlockPad Auto Bot

A Node.js bot for automating tasks on BlockPad testnet with multi-account and proxy support.

## Features
- Multi-account support with custom labels
- Proxy support (HTTP/HTTPS/SOCKS)
- Automatic retries with error handling
- Configurable task sequences
- Colorful console output

## Setup
1. Clone This Repository
```bash
git clone https://github.com/airdropinsiders/Blockpad-Auto-Bot.git
cd Blockpad-Auto-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Create configuration files:
- `token.txt`: One account per line in format `token,label` (label is optional)
  Example:
  ```
  abc123xyz....,labelwallet1
  def456uvw....,labelwallet2
  ```
- `proxy.txt` (optional): One proxy per line
  Example:
  ```
  http://user:pass@ip:port
  socks5://ip:port
  ```

## Usage
```bash
node index.js
```

## Configuration
- Default retry attempts: 3
- Default timeout: 30 seconds
- Sleep intervals configurable in code

## Error Handling
- Automatic retry for failed operations
- Proxy connection error detection
- Faucet cooldown handling
- Graceful shutdown support

## Disclaimer
This bot is for educational purposes only. Use at your own risk and ensure compliance with BlockPad's terms of service.
