// AutoIndex.js

const fs = require('fs');
const path = require('path');
const consoleClear = require('console-clear');
const figlet = require('figlet');
const colors = require('colors');
const Table = require('cli-table3');

const {
    getBearerToken,
    performCheckIn,
    getUserBalance,
    getTribeInfo,
    getUsername,
    getWalletBalance,
    claimFarmingRewards,
    startFarming,
} = require('./scripts/apis');

const BEARER_FILE = path.join(__dirname, 'bearers.json');
const QUERY_IDS_FILE = path.join(__dirname, 'query_ids.json');

function loadJSON(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function initializeBearers(queryIds) {
    const bearers = [];
    for (let i = 0; i < queryIds.length; i++) {
        const queryId = queryIds[i];
        try {
            const bearer = await getBearerToken(queryId);
            bearers[i] = bearer;
        } catch (error) {
            bearers[i] = null;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    saveJSON(BEARER_FILE, bearers);
    return bearers;
}

async function getUserData(bearer) {
    let username = 'N/A';
    let balance = 'N/A';
    let tribe = 'N/A';
    let playChances = 'N/A';
    let walletConnected = 'N/A';

    try {
        const userMe = await getUsername(bearer);
        username = userMe.username || 'N/A';
    } catch {}
    
    try {
        const userBalance = await getUserBalance(bearer);
        balance = userBalance.availableBalance !== undefined ? userBalance.availableBalance : 'N/A';
        playChances = userBalance.playPasses !== undefined ? userBalance.playPasses : 'N/A';
    } catch {}

    try {
        tribe = await getTribeInfo(bearer);
    } catch {}

    try {
        const walletInfo = await getWalletBalance(bearer);
        walletConnected = walletInfo.address ? 'YES' : 'N/A';
    } catch {}

    return {
        username,
        balance,
        tribe,
        playChances,
        walletConnected
    };
}

function displayTable(dataArray) {
    const table = new Table({
        head: ['ID', 'USERNAME', 'BALANCE', 'TRIBE', 'PLAY CHANCES', 'WALLET CONNECTED'],
        colWidths: [5, 20, 15, 20, 15, 20]
    });

    dataArray.forEach((data, index) => {
        table.push([
            index + 1,
            data.username,
            data.balance,
            data.tribe,
            data.playChances,
            data.walletConnected
        ]);
    });

    console.log(table.toString());
}

async function performCheckInAction(username, bearer) {
    try {
        const reward = await performCheckIn(bearer);
        if (reward) {
            console.log(`✅ Daily reward claimed successfully for ${username}`.green);
            const passes = (reward.reward && reward.reward.passes !== undefined) ? reward.reward.passes : 0;
            const points = (reward.reward && reward.reward.points !== undefined) ? reward.reward.points : 0;
            console.log(`${username} performed Check-In for ${reward.ordinal} consecutive days and obtained ${passes} Play Chances & ${points} BP Points`.green);
        }
    } catch (error) {
        if (error.message === 'same day') {
            console.log(`🚨 Daily claim failed for ${username} because you already claimed this day.`.red);
        } else {
            console.log(`🚨 Failed to perform Check-In for ${username}`.red);
            console.log(error.message);
        }
    }
}

async function claimFarmingAction(username, bearer) {
    try {
        const newBalance = await claimFarmingRewards(bearer);
        if (newBalance !== undefined && newBalance !== null) {
            const flooredBalance = Math.floor(parseFloat(newBalance));
            console.log(`${username} has claimed Farming Rewards - your points are now ${flooredBalance} BP`.green);
        }
    } catch (error) {
        if (error.message.includes('Error 425') || error.message.includes('Error 400')) {
            console.log(`🚨 Error claiming Farming Rewards for ${username} - It's too early to claim`.red);
        } else {
            console.log(`🚨 Failed to claim Farming Rewards for ${username}`.red);
            console.log(error.message);
        }
    }
}

async function startFarmingAction(username, bearer) {
    try {
        const farmingData = await startFarming(bearer);
        if (farmingData) {
            const startTime = new Date(farmingData.startTime).toLocaleString();
            const endTime = new Date(farmingData.endTime).toLocaleString();
            console.log(`${username} has started farming at ${startTime} & will end at ${endTime}`.green);
        }
    } catch (error) {
        console.log(`🚨 Failed to start Farming for ${username}`.red);
        console.log(error.message);
    }
}

(async () => {
    try {
        consoleClear();
        console.log(figlet.textSync('BLUM BOT', { horizontalLayout: 'default', verticalLayout: 'default' }).green);
        console.log(`
👋 Hello! Welcome to the Blum AutoFarming Bot
👑 Created by Naeaex - x.com/naeaex_dev - github.com/Naeaerc20
⏳ We're generating Bearer tokens... Please wait
        `.green);

        const queryIds = loadJSON(QUERY_IDS_FILE);

        if (queryIds.length === 0) {
            console.log('🚨 No Query IDs found. Please ensure query_ids.json is populated.'.red);
            process.exit(1);
        }

        // Generate new Bearer tokens for all accounts
        let bearers = await initializeBearers(queryIds);

        // Obtain data for all accounts
        const accounts = [];
        for (let i = 0; i < queryIds.length; i++) {
            const bearer = bearers[i];
            if (bearer) {
                const userData = await getUserData(bearer);
                accounts.push({
                    username: userData.username,
                    balance: userData.balance,
                    tribe: userData.tribe,
                    playChances: userData.playChances,
                    walletConnected: userData.walletConnected,
                    bearer
                });
            } else {
                accounts.push({
                    username: 'N/A',
                    balance: 'N/A',
                    tribe: 'N/A',
                    playChances: 'N/A',
                    walletConnected: 'N/A',
                    bearer: null
                });
            }
        }

        displayTable(accounts.map(account => ({
            username: account.username,
            balance: account.balance,
            tribe: account.tribe,
            playChances: account.playChances,
            walletConnected: account.walletConnected
        })));

        let cycle = 1;

        while (true) {
            console.log(`\n🔄 Starting Cycle ${cycle} at ${new Date().toLocaleString()}`.yellow);

            // Refresh Bearer tokens at the beginning of each cycle
            bearers = await initializeBearers(queryIds);
            for (let i = 0; i < bearers.length; i++) {
                accounts[i].bearer = bearers[i];
            }
            console.log(`\n✅ All bearers have been updated for all users`.green);

            if (cycle === 1) {
                // Perform Check-In for all accounts
                console.log('\n🚀 Performing Check-In for all accounts...'.cyan);
                for (let account of accounts) {
                    if (!account.bearer) continue;
                    await performCheckInAction(account.username, account.bearer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // Wait 30 seconds
                console.log('\n⏳ Waiting 30 seconds before next action...'.cyan);
                await new Promise(resolve => setTimeout(resolve, 30000));

                // Perform Claim Farming Rewards
                console.log('\n🚀 Performing Claim Farming Rewards for all accounts...'.cyan);
                for (let account of accounts) {
                    if (!account.bearer) continue;
                    await claimFarmingAction(account.username, account.bearer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // Wait 30 seconds
                console.log('\n⏳ Waiting 30 seconds before next action...'.cyan);
                await new Promise(resolve => setTimeout(resolve, 30000));

                // Perform Start Farming
                console.log('\n🚀 Performing Start Farming for all accounts...'.cyan);
                for (let account of accounts) {
                    if (!account.bearer) continue;
                    await startFarmingAction(account.username, account.bearer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } else if (cycle === 2 || cycle === 3) {
                // Perform Claim Farming Rewards
                console.log('\n🚀 Performing Claim Farming Rewards for all accounts...'.cyan);
                for (let account of accounts) {
                    if (!account.bearer) continue;
                    await claimFarmingAction(account.username, account.bearer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // Wait 30 seconds
                console.log('\n⏳ Waiting 30 seconds before next action...'.cyan);
                await new Promise(resolve => setTimeout(resolve, 30000));

                // Perform Start Farming
                console.log('\n🚀 Performing Start Farming for all accounts...'.cyan);
                for (let account of accounts) {
                    if (!account.bearer) continue;
                    await startFarmingAction(account.username, account.bearer);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // At the end of the cycle, print completion time and next cycle start time
            const now = new Date();
            const nextCycleTime = new Date(now.getTime() + 9 * 60 * 60 * 1000); // 9 hours later
            console.log(`\n✅ Cycle ${cycle} completed at ${now.toLocaleString()}`.green);
            console.log(`⏰ Next cycle (${cycle % 3 + 1}) will start at ${nextCycleTime.toLocaleString()}`.yellow);

            // Update cycle counter
            cycle = cycle % 3 + 1;

            // Wait 9 hours before starting next cycle
            console.log(`\n⏳ Waiting 9 hours before next cycle...`.cyan);
            await new Promise(resolve => setTimeout(resolve, 9 * 60 * 60 * 1000));

            // No need to refresh bearer tokens here as they will be refreshed at the start of the next loop iteration
        }

    } catch (error) {
        console.log(`🚨 An unexpected error occurred: ${error.message}`.red);
    }
})();

