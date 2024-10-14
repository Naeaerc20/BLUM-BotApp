// index.js

const fs = require('fs');
const path = require('path');
const consoleClear = require('console-clear');
const figlet = require('figlet');
const readline = require('readline-sync');
const Table = require('cli-table3');
const colors = require('colors');

const {
    getBearerToken,
    performCheckIn,
    getUserBalance,
    getTribeInfo,
    getUsername,
    getWalletBalance,
    claimFarmingRewards,
    startFarming,
    getTasks,
    startTaskAction,
    claimTaskAction,
    validateTaskAction,
    getFriendBalance,
    claimReferralRewards
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

async function initializeBearers(queryIds, bearers) {
    for (let i = 0; i < queryIds.length; i++) {
        const queryId = queryIds[i];
        if (!bearers[i]) {
            try {
                const bearer = await getBearerToken(queryId);
                bearers[i] = bearer;
            } catch (error) {
                console.log(`🚨 Error obteniendo Bearer para Query ID ${queryId}: ${error.message}`.red);
                bearers[i] = null;
            }
        }
    }
    saveJSON(BEARER_FILE, bearers);
}

async function refreshBearer(queryId) {
    try {
        const bearer = await getBearerToken(queryId);
        return bearer;
    } catch {
        return null;
    }
}

async function getUserData(bearer) {
    let username = 'N/A';
    let balance = 'N/A';
    let tribu = 'N/A';
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
        tribu = await getTribeInfo(bearer);
    } catch {}

    try {
        const walletInfo = await getWalletBalance(bearer);
        walletConnected = walletInfo.address ? 'YES' : 'N/A';
    } catch {}

    return {
        username,
        balance,
        tribu,
        playChances,
        walletConnected
    };
}

function displayTable(dataArray) {
    const table = new Table({
        head: ['ID', 'USERNAME', 'BALANCE', 'TRIBU', 'PLAY CHANCES', 'WALLET CONNECTED'],
        colWidths: [5, 20, 15, 20, 15, 20]
    });

    dataArray.forEach((data, index) => {
        table.push([
            index + 1,
            data.username,
            data.balance,
            data.tribu,
            data.playChances,
            data.walletConnected
        ]);
    });

    console.log(table.toString());
}

function displayMenu() {
    console.log(`
1. Make Check In
2. Claim Farming Rewards
3. Start Farming
4. Auto Complete Tasks
5. Complete Manual Tasks
6. Play Games
7. Claim Referral Rewards
8. Exit
    `);
}

async function performCheckInAction(username, bearer) {
    try {
        const reward = await performCheckIn(bearer);
        if (reward) {
            console.log(`✅ Daily reward claimed successfully for ${username}`.green);
            console.log(`${username} Performed Check-In for ${reward.ordinal} consecutive Days and Obtained ${reward.reward.passes} Play Chances & ${reward.reward.points} BP Points`.green);
        }
    } catch (error) {
        if (error.message === 'same day') {
            console.log(`🚨 Daily claim failed for ${username} because you already claimed this day.`.red);
        } else {
            console.log(`🚨 Failed to perform Check In for ${username}`.red);
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
            console.log(`🚨 Error Starting Farming for ${username} - It's too early to claim`.red);
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

async function autoCompleteTasksAction(username, bearer) {
    try {
        const tasksData = await getTasks(bearer);
        const defaultTasks = [];

        tasksData.forEach(section => {
            if (section.tasks) {
                section.tasks.forEach(task => {
                    if (task.status === 'NOT_STARTED' && task.validationType === 'DEFAULT') {
                        defaultTasks.push(task);
                    }
                });
            }
            if (section.subSections) {
                section.subSections.forEach(subSection => {
                    if (subSection.tasks) {
                        subSection.tasks.forEach(task => {
                            if (task.status === 'NOT_STARTED' && task.validationType === 'DEFAULT') {
                                defaultTasks.push(task);
                            }
                        });
                    }
                });
            }
        });

        if (defaultTasks.length === 0) {
            console.log(`✅ All Automatic Tasks are completed for ${username}`.green);
            return;
        }

        for (const task of defaultTasks) {
            try {
                await startTaskAction(bearer, task.id);
                const claimed = await claimTaskAction(bearer, task.id);
                if (claimed) {
                    console.log(`✅ ${username} completed Task "${task.title}" & Claimed ${task.reward} BP Points`.green);
                } else {
                    console.log(`🚨 Failed to claim Task "${task.title}" for ${username}`.red);
                }
            } catch (error) {
                if (error.message.includes('400') || error.message.includes('412')) {
                    console.log(`🚨 Task "${task.title}" can't be completed manually please complete it manually`.red);
                } else {
                    console.log(`🚨 Failed to complete Task "${task.title}" for ${username}`.red);
                    console.log(error.message);
                }
            }
        }

        try {
            const userBalance = await getUserBalance(bearer);
            const currentPoints = userBalance.availableBalance !== undefined ? userBalance.availableBalance : 'N/A';
            console.log(`✅ All Automatic Tasks are completed for ${username} - Your points are now ${currentPoints}`.green);
        } catch (error) {
            console.log(`✅ All Automatic Tasks are completed for ${username}`.green);
            console.log(`🚨 Failed to retrieve current points for ${username}`.red);
            console.log(error.message);
        }
    } catch (error) {
        console.log(`🚨 Failed to auto complete tasks for ${username}`.red);
        console.log(error.message);
    }
}

async function completeManualTasksAction(username, bearers) {
    try {
        const tasksData = await getTasks(bearers[0]);
        const keywordTasksMap = new Map();

        tasksData.forEach(section => {
            if (section.tasks) {
                section.tasks.forEach(task => {
                    if (task.validationType === 'KEYWORD' && !keywordTasksMap.has(task.id)) {
                        keywordTasksMap.set(task.id, task);
                    }
                });
            }
            if (section.subSections) {
                section.subSections.forEach(subSection => {
                    if (subSection.tasks) {
                        subSection.tasks.forEach(task => {
                            if (task.validationType === 'KEYWORD' && !keywordTasksMap.has(task.id)) {
                                keywordTasksMap.set(task.id, task);
                            }
                        });
                    }
                });
            }
        });

        const keywordTasks = Array.from(keywordTasksMap.values());

        console.log(`🔍 Found ${keywordTasks.length} manual task(s) requiring a keyword.`.cyan);

        if (keywordTasks.length === 0) {
            console.log(`✅ All Manual Tasks are completed for all users`.green);
            return;
        }

        for (const task of keywordTasks) {
            const taskStatuses = await Promise.all(bearers.map(async (bearer) => {
                try {
                    const userData = await getUserData(bearer);
                    const userTasksData = await getTasks(bearer);
                    let status = 'NOT_STARTED';
                    userTasksData.forEach(section => {
                        if (section.tasks) {
                            section.tasks.forEach(t => {
                                if (t.id === task.id) {
                                    status = t.status;
                                }
                            });
                        }
                        if (section.subSections) {
                            section.subSections.forEach(subSection => {
                                if (subSection.tasks) {
                                    subSection.tasks.forEach(t => {
                                        if (t.id === task.id) {
                                            status = t.status;
                                        }
                                    });
                                }
                            });
                        }
                    });
                    return { bearer, username: userData.username, status };
                } catch (error) {
                    console.log(`🚨 Error obtaining task status for a user: ${error.message}`.red);
                    return { bearer, username: 'N/A', status: 'UNKNOWN' };
                }
            }));

            const allFinished = taskStatuses.every(taskStatus => taskStatus.status === 'FINISHED');

            if (allFinished) {
                console.log(`Task "${task.title}" is already completed for all users`.magenta);
                continue;
            }

            console.log(`\nTask: "${task.title}"`);
            const keyword = readline.question(`Enter keyword for task "${task.title}": `.yellow).trim();

            if (!keyword) {
                console.log(`🚨 No keyword entered for Task "${task.title}". Skipping...`.red);
                continue;
            }

            for (const taskStatus of taskStatuses) {
                const { bearer, username, status } = taskStatus;

                if (status === 'FINISHED') {
                    console.log(`Task "${task.title}" is already completed for ${username}`.magenta);
                    continue;
                }

                if (status === 'READY_FOR_VERIFY') {
                    console.log(`${username} is completing Task "${task.title}"`.green);
                    try {
                        const validated = await validateTaskAction(bearer, task.id, keyword);
                        if (validated) {
                            const updatedTasksData = await getTasks(bearer);
                            let updatedTaskStatus = 'NOT_STARTED';
                            updatedTasksData.forEach(section => {
                                if (section.tasks) {
                                    section.tasks.forEach(t => {
                                        if (t.id === task.id) {
                                            updatedTaskStatus = t.status;
                                        }
                                    });
                                }
                                if (section.subSections) {
                                    section.subSections.forEach(subSection => {
                                        if (subSection.tasks) {
                                            subSection.tasks.forEach(t => {
                                                if (t.id === task.id) {
                                                    updatedTaskStatus = t.status;
                                                }
                                            });
                                        }
                                    });
                                }
                            });

                            if (updatedTaskStatus === 'READY_FOR_CLAIM') {
                                try {
                                    const claimed = await claimTaskAction(bearer, task.id);
                                    if (claimed) {
                                        console.log(`${username} completed & claimed Task "${task.title}" and Obtained ${task.reward} BP Points`.green);
                                    } else {
                                        console.log(`🚨 Failed to claim Task "${task.title}" for ${username}`.red);
                                    }
                                } catch (error) {
                                    console.log(`🚨 Failed to claim Task "${task.title}" for ${username}`.red);
                                    console.log(error.message);
                                }
                            }
                        } else {
                            console.log(`🚨 Failed to validate Task "${task.title}" for ${username}`.red);
                        }
                    } catch (error) {
                        console.log(`🚨 Failed to validate Task "${task.title}" for ${username}`.red);
                        console.log(error.message);
                    }
                } else if (status === 'NOT_STARTED') {
                    console.log(`${username} is initializing Task "${task.title}"`.blue);
                    try {
                        await startTaskAction(bearer, task.id);
                        console.log(`✅ ${username} started Task "${task.title}"`.green);
                    } catch (error) {
                        console.log(`🚨 Failed to start Task "${task.title}" for ${username}`.red);
                        console.log(error.message);
                        continue;
                    }

                    console.log(`${username} is completing Task "${task.title}"`.green);
                    try {
                        const validated = await validateTaskAction(bearer, task.id, keyword);
                        if (validated) {
                            const updatedTasksData = await getTasks(bearer);
                            let updatedTaskStatus = 'NOT_STARTED';
                            updatedTasksData.forEach(section => {
                                if (section.tasks) {
                                    section.tasks.forEach(t => {
                                        if (t.id === task.id) {
                                            updatedTaskStatus = t.status;
                                        }
                                    });
                                }
                                if (section.subSections) {
                                    section.subSections.forEach(subSection => {
                                        if (subSection.tasks) {
                                            subSection.tasks.forEach(t => {
                                                if (t.id === task.id) {
                                                    updatedTaskStatus = t.status;
                                                }
                                            });
                                        }
                                    });
                                }
                            });

                            if (updatedTaskStatus === 'READY_FOR_CLAIM') {
                                try {
                                    const claimed = await claimTaskAction(bearer, task.id);
                                    if (claimed) {
                                        console.log(`${username} completed & claimed Task "${task.title}" and Obtained ${task.reward} BP Points`.green);
                                    } else {
                                        console.log(`🚨 Failed to claim Task "${task.title}" for ${username}`.red);
                                    }
                                } catch (error) {
                                    console.log(`🚨 Failed to claim Task "${task.title}" for ${username}`.red);
                                    console.log(error.message);
                                }
                            }
                        } else {
                            console.log(`🚨 Failed to validate Task "${task.title}" for ${username}`.red);
                        }
                    } catch (error) {
                        console.log(`🚨 Failed to validate Task "${task.title}" for ${username}`.red);
                        console.log(error.message);
                    }
                }
            }
        }

        console.log(`\n✅ All Manual Tasks have been processed for all users`.green);
    } catch (error) {
        console.log(`🚨 Failed to complete manual tasks for all users`.red);
        console.log(error.message);
    }
}

async function claimReferralRewardsOption(username, bearer) {
    try {
        const balanceData = await getFriendBalance(bearer);
        const { canClaim, amountForClaim } = balanceData;

        if (canClaim && parseFloat(amountForClaim) > 0) {
            const claimBalance = await claimReferralRewards(bearer);
            const claimBalanceFloat = parseFloat(claimBalance);
            console.log(`✅ ${username} has claimed ${claimBalanceFloat.toFixed(2)} BP Points from Referral Rewards`.green);
        } else {
            console.log(`${username} doesn't have available referral rewards to claim now.`.magenta);
        }
    } catch (error) {
        console.log(`🚨 Failed to claim Referral Rewards for ${username}`.red);
        console.log(error.message);
    }
}

async function executeActionForAll(action, accounts) {
    switch (action) {
        case '1':
            for (let account of accounts) {
                if (!account.bearer) continue;
                await performCheckInAction(account.username, account.bearer);
                await new Promise(resolve => setTimeout(resolve, 900));
            }
            break;
        case '2':
            for (let account of accounts) {
                if (!account.bearer) continue;
                await claimFarmingAction(account.username, account.bearer);
                await new Promise(resolve => setTimeout(resolve, 900));
            }
            break;
        case '3':
            for (let account of accounts) {
                if (!account.bearer) continue;
                await startFarmingAction(account.username, account.bearer);
                await new Promise(resolve => setTimeout(resolve, 900));
            }
            break;
        case '4':
            for (let account of accounts) {
                if (!account.bearer) continue;
                await autoCompleteTasksAction(account.username, account.bearer);
                await new Promise(resolve => setTimeout(resolve, 900));
            }
            break;
        case '5':
            const bearers = accounts.map(account => account.bearer).filter(bearer => bearer !== null);
            if (bearers.length === 0) {
                console.log('🚨 No bearers disponibles para completar tareas manuales.'.red);
                break;
            }
            await completeManualTasksAction(accounts[0].username, bearers);
            break;
        case '6':
            console.log('ℹ️ Play Games feature is coming soon.'.magenta);
            break;
        case '7':
            for (let account of accounts) {
                if (!account.bearer) continue;
                await claimReferralRewardsOption(account.username, account.bearer);
                await new Promise(resolve => setTimeout(resolve, 900));
            }
            break;
        default:
            console.log('🚨 Invalid option. Please try again.'.red);
    }

    // Esperar a que el usuario presione Enter para volver al menú
    readline.question('Press Enter to see main menu again...'.yellow);
}

(async () => {
    consoleClear();
    console.log(figlet.textSync('BLUM BOT', { horizontalLayout: 'default', verticalLayout: 'default' }).green);
    console.log(`
👋 Hello! Welcome to the Blum AutoFarming Bot
👑 Created by Naeaex - x.com/naeaex_dev - github.com/Naeaerc20
⏳ We're fetching your data... Please wait
    `.green);

    let bearers = loadJSON(BEARER_FILE);
    const queryIds = loadJSON(QUERY_IDS_FILE);

    if (queryIds.length === 0) {
        console.log('🚨 No Query IDs found. Please ensure query_ids.json is populated.'.red);
        process.exit(1);
    }

    if (bearers.length !== queryIds.length) {
        await initializeBearers(queryIds, bearers);
        bearers = loadJSON(BEARER_FILE);
    }

    // Obtener datos de todas las cuentas
    const accounts = [];
    for (let i = 0; i < queryIds.length; i++) {
        const bearer = bearers[i];
        if (bearer) {
            const userData = await getUserData(bearer);
            accounts.push({
                username: userData.username,
                balance: userData.balance,
                tribu: userData.tribu,
                playChances: userData.playChances,
                walletConnected: userData.walletConnected,
                bearer
            });
        } else {
            accounts.push({
                username: 'N/A',
                balance: 'N/A',
                tribu: 'N/A',
                playChances: 'N/A',
                walletConnected: 'N/A',
                bearer: null
            });
        }
    }

    displayTable(accounts.map(account => ({
        username: account.username,
        balance: account.balance,
        tribu: account.tribu,
        playChances: account.playChances,
        walletConnected: account.walletConnected
    })));

    let exit = false;
    while (!exit) {
        displayMenu();
        const choice = readline.question('Select an option: '.yellow).trim();

        if (choice === '8') {
            exit = true;
            break;
        }

        if (!['1', '2', '3', '4', '5', '6', '7'].includes(choice)) {
            console.log('🚨 Invalid option. Please try again.'.red);
            continue;
        }

        await executeActionForAll(choice, accounts);

        // Actualizar los datos de todas las cuentas después de realizar la acción
        for (let i = 0; i < queryIds.length; i++) {
            const bearer = accounts[i].bearer;
            if (bearer) {
                const userData = await getUserData(bearer);
                accounts[i].username = userData.username;
                accounts[i].balance = userData.balance;
                accounts[i].tribu = userData.tribu;
                accounts[i].playChances = userData.playChances;
                accounts[i].walletConnected = userData.walletConnected;
            }
        }

        // Rotar los bearers con una demora de 900ms entre cada rotación
        for (let i = 0; i < queryIds.length; i++) {
            const queryId = queryIds[i];
            const newBearer = await refreshBearer(queryId);
            if (newBearer) {
                bearers[i] = newBearer;
                accounts[i].bearer = newBearer;
                saveJSON(BEARER_FILE, bearers);

                // Actualizar los datos de la cuenta con el nuevo bearer
                const userData = await getUserData(newBearer);
                accounts[i].username = userData.username;
                accounts[i].balance = userData.balance;
                accounts[i].tribu = userData.tribu;
                accounts[i].playChances = userData.playChances;
                accounts[i].walletConnected = userData.walletConnected;
            }
            // Esperar 900ms antes de la siguiente rotación
            if (i < queryIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 900));
            }
        }

        // Limpiar la consola y mostrar la tabla actualizada
        consoleClear();
        console.log(figlet.textSync('BLUM BOT', { horizontalLayout: 'default', verticalLayout: 'default' }).green);
        console.log(`
👋 Hello! Welcome to the Blum AutoFarming Bot
👑 Created by Naeaex - x.com/naeaex_dev - github.com/Naeaerc20
⏳ We're fetching your data... Please wait
    `.green);

        displayTable(accounts.map(account => ({
            username: account.username,
            balance: account.balance,
            tribu: account.tribu,
            playChances: account.playChances,
            walletConnected: account.walletConnected
        })));
    }

    console.log('✅ All accounts have been processed.'.green);
})();
