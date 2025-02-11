import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs/promises';
import { ProxyAgent } from 'proxy-agent';
import banner from './banner.js';

class BlockPadTask {
    constructor(token, label, proxy = null) {
        this.token = token;
        this.label = label;
        this.baseURL = 'https://api2.blockpad.fun/api';
        this.headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Origin': 'https://testnet.blockpad.fun',
            'Referer': 'https://testnet.blockpad.fun/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        };

        this.axiosInstance = axios.create({
            headers: this.headers,
            timeout: 30000
        });

        if (proxy) {
            try {
                const agent = new ProxyAgent(proxy);
                this.axiosInstance.defaults.httpsAgent = agent;
                this.axiosInstance.defaults.httpAgent = agent;
            } catch (error) {
                console.error(chalk.red(`❌ [${this.label}] Proxy configuration error: ${error.message}`));
            }
        }
    }

    async executeWithRetry(operation, maxRetries = 3, operationName = '') {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (error.response?.status === 400 && error.response?.data?.error?.includes('Faucet on cooldown')) {
                    console.log(chalk.yellow(`⏳ [${this.label}] ${error.response.data.error}`));
                    console.log(chalk.yellow(`⌛ [${this.label}] Remaining hours: ${error.response.data.remainingHours}`));
                    return null;
                }

                const errorMessage = error.response?.data?.error || error.message;
                if (attempt === maxRetries) {
                    console.error(chalk.red(`❌ [${this.label}] ${operationName} failed after ${maxRetries} attempts: ${errorMessage}`));
                    if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                        console.log(chalk.yellow(`🔄 [${this.label}] Proxy connection issue detected, continuing...`));
                    }
                    return null;
                }
                console.log(chalk.yellow(`⚠️ [${this.label}] ${operationName} - Attempt ${attempt} failed: ${errorMessage}`));
                await sleep(10);
            }
        }
    }

    // Task methods with label support
    async claimFaucet() {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`🎯 [${this.label}] Claiming faucet...`));
            const response = await this.axiosInstance.post(`${this.baseURL}/faucet/claim`);
            console.log(chalk.green(`✅ [${this.label}] Faucet claimed successfully`));
            return response.data;
        }, 3, 'Faucet claim');
    }

    async swap(fromToken, toToken, amount) {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`🔄 [${this.label}] Swapping ${amount} ${fromToken} to ${toToken}...`));
            const response = await this.axiosInstance.post(
                `${this.baseURL}/swap/execute`,
                { fromToken, toToken, amount }
            );
            console.log(chalk.green(`✅ [${this.label}] Swap executed successfully`));
            return response.data;
        }, 3, 'Swap');
    }

    async addLiquidity(tICEAmount) {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`💧 [${this.label}] Adding liquidity: ${tICEAmount} tICE...`));
            const response = await this.axiosInstance.post(
                `${this.baseURL}/liquidity/add`,
                { tICEAmount }
            );
            console.log(chalk.green(`✅ [${this.label}] Liquidity added successfully`));
            return response.data;
        }, 3, 'Add liquidity');
    }

    async removeLiquidity(tICEAmount) {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`🔄 [${this.label}] Removing liquidity: ${tICEAmount} tICE...`));
            const response = await this.axiosInstance.post(
                `${this.baseURL}/liquidity/remove`,
                { tICEAmount }
            );
            console.log(chalk.green(`✅ [${this.label}] Liquidity removed successfully`));
            return response.data;
        }, 3, 'Remove liquidity');
    }

    async stake(token, amount) {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`📥 [${this.label}] Staking ${amount} ${token}...`));
            const response = await this.axiosInstance.post(
                `${this.baseURL}/staking/stake`,
                { token, amount }
            );
            console.log(chalk.green(`✅ [${this.label}] Staking successful`));
            return response.data;
        }, 3, 'Stake');
    }

    async unstake(token, amount) {
        return this.executeWithRetry(async () => {
            console.log(chalk.cyan(`📤 [${this.label}] Unstaking ${amount} ${token}...`));
            const response = await this.axiosInstance.post(
                `${this.baseURL}/staking/unstake`,
                { token, amount }
            );
            console.log(chalk.green(`✅ [${this.label}] Unstaking successful`));
            return response.data;
        }, 3, 'Unstake');
    }
}

async function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function loadAccounts() {
    try {
        const data = await fs.readFile('accounts.txt', 'utf8');
        return data.split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const [token, label] = line.split(',');
                return {
                    token: token.trim(),
                    label: label?.trim() || token.slice(0, 15) // Use first 15 chars of token as default label
                };
            });
    } catch (error) {
        console.error(chalk.red('Error reading accounts:', error.message));
        return [];
    }
}

async function loadProxies() {
    try {
        const data = await fs.readFile('proxy.txt', 'utf8');
        return data.split('\n').map(line => line.trim()).filter(Boolean);
    } catch (error) {
        console.error(chalk.red('Error reading proxies:', error.message));
        return [];
    }
}

async function runAccount(account, proxy = null) {
    console.log(chalk.yellow(`\n🔐 Starting tasks for account: ${account.label}...`));
    if (proxy) {
        console.log(chalk.yellow(`🌐 [${account.label}] Using proxy: ${proxy}`));
    }

    const bot = new BlockPadTask(account.token, account.label, proxy);
    
    while (true) {
        try {
            const faucetResult = await bot.claimFaucet();
            await sleep(5);

            while (true) {
                try {
                    await bot.swap('tICE', 'BPAD', 10);
                    await sleep(5);

                    await bot.addLiquidity(0.5);
                    await sleep(5);

                    await bot.removeLiquidity(0.5);
                    await sleep(5);

                    await bot.stake('tICE', 100);
                    await sleep(5);

                    await bot.unstake('tICE', 100);
                    await sleep(5);

                    console.log(chalk.yellow(`🔄 [${account.label}]: Completing one cycle, starting next...`));
                    await sleep(10);
                } catch (error) {
                    console.error(chalk.red(`❌ [${account.label}] - Error in operation cycle:`, error.message));
                    await sleep(30);
                    continue;
                }
            }
        } catch (error) {
            console.error(chalk.red(`❌ [${account.label}] - Major error, restarting cycle:`, error.message));
            await sleep(60);
            continue;
        }
    }
}

async function main() {
    try {
        banner();
        
        console.log(chalk.cyan('\n🚀 Starting BlockPad Multi-Account Task Bot...\n'));

        const accounts = await loadAccounts();
        const proxies = await loadProxies();

        if (accounts.length === 0) {
            console.error(chalk.red('❌ No accounts found in accounts.txt'));
            process.exit(1);
        }

        console.log(chalk.green(`📝 Loaded ${accounts.length} accounts`));
        console.log(chalk.green(`🌐 Loaded ${proxies.length} proxies\n`));

        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n\n🛑 Received stop signal. Shutting down gracefully...'));
            process.exit(0);
        });

        const tasks = accounts.map((account, index) => {
            const proxy = proxies.length > 0 ? proxies[index % proxies.length] : null;
            return runAccount(account, proxy);
        });

        await Promise.all(tasks);
    } catch (error) {
        console.error(chalk.red('❌ Fatal error in main process:', error.message));
        await sleep(60);
        main();
    }
}

console.log(chalk.cyan('🚀 Initializing BlockPad Task Bot...'));
main().catch(async error => {
    console.error(chalk.red('❌ Critical error:', error.message));
    await sleep(60);
    main();
});