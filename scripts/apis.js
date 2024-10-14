// scripts/apis.js

const axios = require('axios');

async function performCheckIn(bearer) {
    try {
        const { data } = await axios({
            url: 'https://game-domain.blum.codes/api/v1/daily-reward?offset=-420',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${bearer}`,
                'Content-Type': 'application/json'
            },
            data: null,
        });

        return data;
    } catch (error) {
        if (error.response && error.response.data.message === 'same day') {
            throw new Error('same day');
        } else if (error.response) {
            throw new Error(error.response.data.message || error.message);
        } else {
            throw new Error('Network error: Unable to connect to the server');
        }
    }
}

async function getBearerToken(queryId) {
    try {
        const response = await axios.post('https://user-domain.blum.codes/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP', {
            query: queryId
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data.token.access;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to obtain bearer token'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function getFriendBalance(bearer) {
    try {
        const response = await axios.get('https://user-domain.blum.codes/api/v1/friends/balance', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get friend balance'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function claimReferralRewards(bearer) {
    try {
        const response = await axios.post('https://user-domain.blum.codes/api/v1/friends/claim', {}, {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data.claimBalance;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to claim referral rewards'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function getUserBalance(bearer) {
    try {
        const response = await axios.get('https://game-domain.blum.codes/api/v1/user/balance', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return {
            availableBalance: response.data.availableBalance,
            playPasses: response.data.playPasses
        };
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get user balance'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function getTribeInfo(bearer) {
    try {
        const response = await axios.get('https://tribe-domain.blum.codes/api/v1/tribe/my', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        if (response.data.message === 'NOT_FOUND') {
            return 'N/A';
        }
        return response.data.title || 'N/A';
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return 'N/A';
        }
        throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get tribe info'}`);
    }
}

async function getUsername(bearer) {
    try {
        const response = await axios.get('https://user-domain.blum.codes/api/v1/user/me', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get username'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function getWalletBalance(bearer) {
    try {
        const response = await axios.get('https://wallet-domain.blum.codes/api/v1/wallet/my', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return {
            address: response.data.address,
            balanceMigrated: response.data.balanceMigrated
        };
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get wallet balance'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function claimFarmingRewards(bearer) {
    try {
        const response = await axios.post('https://game-domain.blum.codes/api/v1/farming/claim', {}, {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data.availableBalance;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to claim farming rewards'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function startFarming(bearer) {
    try {
        const response = await axios.post('https://game-domain.blum.codes/api/v1/farming/start', {}, {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return {
            startTime: response.data.startTime,
            endTime: response.data.endTime
        };
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to start farming'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function getTasks(bearer) {
    try {
        const response = await axios.get('https://earn-domain.blum.codes/api/v1/tasks', {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to get tasks'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function startTaskAction(bearer, taskId) {
    try {
        const response = await axios.post(`https://earn-domain.blum.codes/api/v1/tasks/${taskId}/start`, {}, {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data.status === 'STARTED';
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to start task'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function claimTaskAction(bearer, taskId) {
    try {
        const response = await axios.post(`https://earn-domain.blum.codes/api/v1/tasks/${taskId}/claim`, {}, {
            headers: {
                Authorization: `Bearer ${bearer}`
            }
        });
        return response.data.status === 'FINISHED';
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to claim task'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

async function validateTaskAction(bearer, taskId, keyword) {
    try {
        const response = await axios.post(`https://earn-domain.blum.codes/api/v1/tasks/${taskId}/validate`, {
            keyword: keyword
        }, {
            headers: {
                Authorization: `Bearer ${bearer}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.status === 'READY_FOR_CLAIM';
    } catch (error) {
        if (error.response) {
            throw new Error(`Error ${error.response.status}: ${error.response.data.message || 'Failed to validate task'}`);
        }
        throw new Error('Network error: Unable to connect to the server');
    }
}

module.exports = {
    getBearerToken,
    getFriendBalance,
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
    claimReferralRewards
};
