import { TEAMS } from '../data/teams.js?v=2';

// --- Helpers ---
function createEl(tag, className, text = '') {
    const el = document.createElement(tag);
    if(className) el.className = className;
    if(text) el.textContent = text;
    return el;
}

// --- Views ---

export const MainMenu = ({ onNewGame, onContinue, hasSave }) => {
    const container = createEl('div', 'screen');
    
    // Background decoration (optional, could be added via CSS)
    
    const content = createEl('div', 'main-menu-content');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.zIndex = '2';

    const title = createEl('h1', 'title', 'FÚTBOL\nARGENTINO\nARCADE');
    title.style.whiteSpace = 'pre-line'; // Allow newlines
    title.style.textAlign = 'center';
    content.appendChild(title);

    const btnNew = createEl('button', 'btn', 'NUEVA CARRERA');
    btnNew.onclick = onNewGame;
    
    // Add icon or effect if needed
    content.appendChild(btnNew);

    if (hasSave) {
        const btnContinue = createEl('button', 'btn btn-secondary', 'CONTINUAR');
        btnContinue.onclick = onContinue;
        content.appendChild(btnContinue);
    }
    
    const footer = createEl('p', 'footer', 'v1.0.0 - Desarrollado por Antigravity');
    footer.style.marginTop = '40px';
    footer.style.opacity = '0.5';
    footer.style.fontSize = '0.9rem';
    content.appendChild(footer);

    container.appendChild(content);

    return container;
};

export const CareerSetup = ({ onStart }) => {
    const container = createEl('div', 'screen');
    
    const h2 = createEl('h2', '', 'Tu Equipo');
    container.appendChild(h2);

    // Simple select for now
    const select = createEl('select', 'team-select');
    // Sort teams by name
    const sortedTeams = [...TEAMS].sort((a,b) => a.name.localeCompare(b.name));
    
    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = `${team.name} (${team.rating})`;
        select.appendChild(option);
    });
    container.appendChild(select);

    const btnStart = createEl('button', 'btn', 'Comenzar Temporada');
    btnStart.onclick = () => {
        const teamId = select.value;
        onStart(teamId);
    };
    container.appendChild(btnStart);

    return container;
};

export const Dashboard = ({ team, leagueA, leagueB, nextMatch, onPlayMatch, onNextWeek, currentSeason }) => {
    const container = createEl('div', 'screen dashboard-container');

    // --- LEFT SIDE: Standings ---
    const leftPanel = createEl('div', 'dashboard-left');
    
    // Header Wrapper for custom dropdown logic
    const headerWrapper = createEl('div', 'league-header');
    const headerTitle = createEl('h3', '', ''); // Set initially
    const headerArrow = createEl('span', 'arrow', '▼');
    headerWrapper.appendChild(headerTitle);
    headerWrapper.appendChild(headerArrow);

    const dropdown = createEl('div', 'league-dropdown');
    const optionA = createEl('div', 'league-option', leagueA.name);
    const optionB = createEl('div', 'league-option', leagueB.name);
    dropdown.appendChild(optionA);
    dropdown.appendChild(optionB);

    headerWrapper.appendChild(dropdown);
    leftPanel.appendChild(headerWrapper);

    // Table Container (Scrollable)
    const tableContainer = createEl('div', 'table-scroll-area');
    leftPanel.appendChild(tableContainer);

    // Logic for Switching
    // Default to Team's League
    let currentLeague = leagueA.teams.find(t => t.id === team.id) ? leagueA : leagueB;
    
    const renderContent = () => {
        headerTitle.textContent = currentLeague.name;
        tableContainer.innerHTML = '';
        tableContainer.appendChild(renderTableContent(currentLeague)); // Just the table content, not container
    };

    // Toggle Dropdown
    headerWrapper.onclick = (e) => {
        // Prevent closing when clicking options instantly
        e.stopPropagation();
        dropdown.classList.toggle('show');
        headerWrapper.classList.toggle('active');
    };
    
    // Close dropdown on outside click
    window.onclick = () => {
        dropdown.classList.remove('show');
        headerWrapper.classList.remove('active');
    };

    optionA.onclick = () => {
        currentLeague = leagueA;
        renderContent();
    };

    optionB.onclick = () => {
        currentLeague = leagueB;
        renderContent();
    };

    renderContent(); // Initial render
    container.appendChild(leftPanel);

    // --- RIGHT SIDE: Match Info ---
    const rightPanel = createEl('div', 'dashboard-right');

    const teamHeader = createEl('h2', '', `${team.name}`);
    teamHeader.style.fontSize = '3rem';
    rightPanel.appendChild(teamHeader);
    
    const seasonInfo = createEl('p', '', `Temporada ${currentSeason}`);
    seasonInfo.style.marginBottom = '30px';
    rightPanel.appendChild(seasonInfo);

    if (nextMatch) {
         const vs = nextMatch.home.id === team.id ? nextMatch.away : nextMatch.home;
         
         const card = createEl('div', 'match-card');
         card.innerHTML = `
            <h3>PRÓXIMO PARTIDO</h3>
            <div class="versus">VS</div>
            <h2 style="color:white; text-shadow:none;">${vs.name}</h2>
            <p style="margin-top:10px;">Rating: ${vs.rating}</p>
         `;
         rightPanel.appendChild(card);
         
         const btnPlay = createEl('button', 'btn', 'JUGAR');
         btnPlay.onclick = onPlayMatch;
         rightPanel.appendChild(btnPlay);
    } else {
        const info = createEl('div', 'info', 'TEMPORADA FINALIZADA');
        info.style.fontSize = '2rem';
        info.style.marginBottom = '30px';
        rightPanel.appendChild(info);
        
        const btnNext = createEl('button', 'btn', 'SIGUIENTE TEMP.');
        btnNext.onclick = onNextWeek; 
        rightPanel.appendChild(btnNext);
    }

    container.appendChild(rightPanel);

    return container;
};

// Internal helper for just table content
function renderTableContent(league) {
    const table = document.createElement('table');
    table.style.width = '100%'; 
    table.style.borderCollapse = 'collapse';
    
    // Header
    table.innerHTML = `
        <tr style="border-bottom: 2px solid rgba(255,255,255,0.1)">
            <th style="width: 30px;">Pos</th>
            <th style="width: auto;">Club</th>
            <th style="width: 50px; font-size: 1.1rem;">Pts</th>
            <th style="width: 40px;">PJ</th>
            <th style="width: 40px;">DG</th>
        </tr>
    `;
    
    const standings = league.getStandingsArray();
    standings.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        let color = '#ffffff'; // Default white
        let textShadow = 'none';
        let fontWeight = 'normal';

        // Logic for Colors
        if (index === 0) {
            // Champion / Leader -> Gold
            color = '#ffd700';
            textShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
            fontWeight = 'bold';
        } else {
            // Specific League Rules
            if (league.level === 1) { // Liga Profesional
                // Relegation (Last 3)
                if (index >= standings.length - 3) color = '#e74c3c'; // Red (Relegation last 3)
            } else if (league.level === 2) { // Primera Nacional
                // Promotion (2nd and 3rd, since 1st is Gold)
                if (index <= 2) color = '#2ecc71'; // Green
            }
        }
        
        tr.style.color = color;
        tr.style.textShadow = textShadow;
        tr.style.fontWeight = fontWeight;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="padding: 0;">
                <div style="display: flex; align-items: center; padding-left: 5px;">
                    <img src="${row.team.logo || ''}" style="width: 24px; height: 24px; object-fit: contain; margin-right: 8px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${row.team.name}</span>
                </div>
            </td>
            <td style="font-weight: bold; font-size: 1.1rem; vertical-align: middle;">${row.points}</td>
            <td style="vertical-align: middle;">${row.played}</td>
            <td style="vertical-align: middle;">${row.gd}</td>
        `;

        table.appendChild(tr);
    });

    return table;
}

export const MatchResults = ({ homeScore, awayScore, onContinue }) => {
    const container = createEl('div', 'screen');
    const h1 = createEl('h1', '', `${homeScore} - ${awayScore}`);
    container.appendChild(h1);
    
    const btn = createEl('button', 'btn', 'Continuar');
    btn.onclick = onContinue;
    container.appendChild(btn);
    
    return container;
};
