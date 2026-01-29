const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 
const fs = require('fs');
const path = require('path');

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const dataFolder = path.join(__dirname, '../data');
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req, res) {  
    try {
        const agents = await getAgents(); 
        const savedAgents = getSavedAgents();

        const allowedTeams = ["Technicians - IT", "Technician - Service", "Sales"];

        // Group agents into Tech and Sales
        let teamWiseAgents = { Tech: [], Sales: [] };
        const techList = readTechFile();
        agents.data.forEach(agent => {
            let teamName = agent.team && agent.team.trim() !== '' ? agent.team : 'Default';

            if (allowedTeams.includes(teamName)) {
                let groupName = teamName.includes("Technician") ? "Tech" : "Sales";

                // Correct lookup in savedAgents
                const savedGroup = groupName === "Tech"
                    ? [...(savedAgents.Tech || [])]  // Using merged Tech group from getSavedAgents()
                    : (savedAgents.Sales || []);

                const isChecked = savedGroup.some(saved => saved.name === agent.name);
                teamWiseAgents[groupName].push({ ...agent, isChecked });
            }
        });

        res.render('admin', { teamWiseAgents , techList  });

    } catch (error) {
        console.log("Error loading agents:", error);
        res.render('404', { error: "Error loading agents" });
    }
};

module.exports.saveAgents = async function (req, res) {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ message: "No agent data received!" });
        }

        const selectedAgents = req.body;

       
        

        for (const [team, agents] of Object.entries(selectedAgents)) {
            if (!Array.isArray(agents)) continue;
            // console.log(team);
            
            if(team == 'Tech' || team == 'order'){
                // const fileName = `${team.replace(/\s+/g, '_')}.txt`;
                const fileName = `Tech.txt`;
                const filePath = path.join(dataFolder, fileName);
                const fileContent = agents.map(agent => `Name: ${agent.name}, ID: ${agent.id}`).join('\n');

                fs.writeFileSync(filePath, fileContent, 'utf8');
            }
            // console.log(fileContent +" " + filePath);
            
        }

        res.json({ message: "Agents saved successfully!" });

    } catch (error) {
        console.error("Error saving agents:", error);
        res.status(500).json({ message: "Error saving agents" });
    }
};

function getSavedAgents() {
    let savedAgents = { Tech: [], Sales: [] };

    // Define the expected files
    const teamFiles = {
        Tech: 'Tech.txt',
        Sales: 'Sales.txt'
    };

    for (const [group, fileName] of Object.entries(teamFiles)) {
        const filePath = path.join(dataFolder, fileName);

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');

            const agents = content.split('\n').map(line => {
                const match = line.match(/Name: (.*?), ID: (\d+)/);
                return match ? { name: match[1], id: match[2] } : null;
            }).filter(Boolean);

            savedAgents[group] = agents;
        }
    }

    return savedAgents;
}

async function getAgents(){
    try {
        const options = {
            headers: { 'Authorization': 'bearer ' + await getAccessToken() }
        };
        const response = await axios.get(`${baseURL}/Agent`, options);
        
        response.data
        .sort((a, b) => a.id - b.id) // Sorting by id in ascending order
        .forEach(agent => {
            // console.log(agent.id + " " + agent.name);
        });

        const maxId = Math.max(...response.data.map(agent => agent.id));

        // Create an array filled with empty strings
        const agentArray = new Array(maxId + 1).fill("");

        // Populate the array with agent names
        response.data.forEach(agent => {
            agentArray[agent.id] = agent.name;
        });

        localStorage.setItem('agent',agentArray);
        
        return { status: 200, data: response.data };

    } catch (error) {
        console.log("Error fetching agents:", error.response?.data || error.message);
        return { status: 404, data: 'Error in getting data' };
    }
}

function readTechFile() {
    const data = fs.readFileSync( path.join(dataFolder,"Tech.txt"), "utf-8");
    return data.split("\n").map(line => {
        const match = line.match(/Name:\s(.+),\sID:\s(\d+)/);
        return match ? { name: match[1], id: match[2] } : null;
    }).filter(Boolean);
}
