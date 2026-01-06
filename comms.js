// Communications Tab - Email Activity & Follow-ups
// Uses Supabase for data storage with localStorage fallback

// Default data (fallback when Supabase unavailable)
const defaultCommsData = {
    sent: [
        { date: '2026-01-06 00:33', client: 'ElectraNet', subject: 'Clements Gap R1 DD - Variation - Q7211', to: 'Sazzad Rahman' },
        { date: '2026-01-06 00:31', client: 'OX2', subject: 'RE: Vysus support OX2 harmonic assessment', to: 'Alex Trieu' },
        { date: '2026-01-06 00:02', client: 'Alinta', subject: 'Re: Q7193: Proposal - Mt Challenger WF+BESS project', to: 'Cedric Banda' },
        { date: '2026-01-05 23:49', client: 'ElectraNet', subject: 'GRD0500100 - Clements Gap R1 DD - Variation', to: 'Sazzad Rahman' },
        { date: '2025-12-23 07:58', client: 'Powerlink', subject: 'Haughton FIA DD corrections', to: 'Client Team' },
        { date: '2025-12-23 00:12', client: 'Alinta', subject: 'Re: Q7193: Proposal - Mt Challenger WF+BESS project', to: 'Cedric Banda, Akhil Pai' },
        { date: '2025-12-22 04:53', client: 'Powerlink', subject: 'Haughton BESS FIA DD connections', to: 'Mohammed Nathar' },
        { date: '2025-12-18 02:59', client: 'Origin', subject: 'RE: Request for latest SMA GFM inverter model', to: 'Amani Syafiqah' },
        { date: '2025-12-17 03:20', client: 'ElectraNet', subject: 'RE: status - Aerosmith', to: 'Anthony Hickman' },
        { date: '2025-12-16 10:43', client: 'Alinta', subject: 'Re: Q7193: Proposal - Mt Challenger WF+BESS project', to: 'Cedric Banda' },
    ],
    received: [
        { date: '2026-01-06 00:48', client: 'OX2', subject: 'RE: Vysus support OX2 harmonic assessment', from: 'Alex Trieu' },
        { date: '2026-01-02 03:52', client: 'Hallett', subject: 'Vysus-VE: Progress Call (ABESS-ITs)', from: 'Subrato Saha' },
        { date: '2025-12-24 07:07', client: 'Powerlink', subject: 'RE: Haughton BESS FIA DD connections', from: 'Naveen Rajagopal' },
        { date: '2025-12-23 04:22', client: 'Transgrid', subject: 'Pre-TG/AEMO DD response on 19th December', from: 'Subrato Saha' },
        { date: '2025-12-23 00:15', client: 'Alinta', subject: 'Automatic reply: Q7193: Proposal - Mt Challenger', from: 'Cedric Banda' },
        { date: '2025-12-18 02:39', client: 'AEMO', subject: 'RE: AO_GEAS Q7198 - PSCAD model suitability', from: 'Tony Morton' },
        { date: '2025-12-16 10:36', client: 'Alinta', subject: 'Accepted: Mt Challenger WF+BESS Pre-Christmas Check-in', from: 'Akhil Pai' },
        { date: '2025-12-16 08:09', client: 'Alinta', subject: 'Accepted: Mt Challenger WF+BESS Pre-Christmas Check-in', from: 'Cedric Banda' },
        { date: '2025-12-16 06:06', client: 'Transgrid', subject: 'Pre-TG/AEMO DD response on 19th December', from: 'Subrato Saha' },
    ],
    followups: [
        { date: '2026-01-07', client: 'OX2', task: 'Send harmonic assessment proposal', priority: 'high', contact: 'Alex Trieu' },
        { date: '2026-01-08', client: 'ElectraNet', task: 'Follow up on variation approval', priority: 'medium', contact: 'Sazzad Rahman' },
        { date: '2026-01-10', client: 'Alinta', task: 'Check on Mt Challenger project status', priority: 'medium', contact: 'Cedric Banda' },
        { date: '2026-01-13', client: 'Powerlink', task: 'Haughton BESS - Submit final corrections', priority: 'high', contact: 'Mohammed Nathar' },
        { date: '2026-01-15', client: 'Hallett', task: 'Progress call follow-up with Valent', priority: 'low', contact: 'Subrato Saha' },
        { date: '2026-01-17', client: 'AEMO', task: 'PSCAD model suitability final response', priority: 'high', contact: 'Tony Morton' },
        { date: '2026-01-20', client: 'Transgrid', task: 'DD response review meeting', priority: 'medium', contact: 'Subrato Saha' },
    ]
};

let commsData = JSON.parse(JSON.stringify(defaultCommsData));
let commsDataSource = 'local';

// Supabase Communications Service
const CommsService = {
    async isSupabaseAvailable() {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return false;
        try {
            const session = await supabaseClient.auth.getSession();
            return !!session?.data?.session;
        } catch (e) {
            return false;
        }
    },

    async loadFromSupabase() {
        if (!await this.isSupabaseAvailable()) return null;

        try {
            // Load communications
            const { data: comms, error: commsError } = await supabaseClient
                .from('communications')
                .select('*')
                .order('comm_date', { ascending: false })
                .limit(100);

            // Load followups
            const { data: followups, error: followupsError } = await supabaseClient
                .from('followups')
                .select('*')
                .eq('completed', false)
                .order('due_date', { ascending: true });

            if (commsError || followupsError) {
                console.log('Supabase comms load error:', commsError || followupsError);
                return null;
            }

            // Transform to our format
            const sent = comms?.filter(c => c.comm_type === 'sent').map(c => ({
                id: c.id,
                date: new Date(c.comm_date).toISOString().slice(0, 16).replace('T', ' '),
                client: c.client,
                subject: c.subject,
                to: c.contact_name
            })) || [];

            const received = comms?.filter(c => c.comm_type === 'received').map(c => ({
                id: c.id,
                date: new Date(c.comm_date).toISOString().slice(0, 16).replace('T', ' '),
                client: c.client,
                subject: c.subject,
                from: c.contact_name
            })) || [];

            const followupsList = followups?.map(f => ({
                id: f.id,
                date: f.due_date,
                client: f.client,
                task: f.task,
                priority: f.priority,
                contact: f.contact_name
            })) || [];

            return { sent, received, followups: followupsList };
        } catch (e) {
            console.log('Supabase comms load exception:', e);
            return null;
        }
    },

    async saveToSupabase(type, item) {
        if (!await this.isSupabaseAvailable()) return false;

        try {
            if (type === 'communication') {
                const { error } = await supabaseClient
                    .from('communications')
                    .insert({
                        comm_type: item.type, // 'sent' or 'received'
                        comm_date: item.date,
                        client: item.client,
                        subject: item.subject,
                        contact_name: item.contact
                    });
                return !error;
            } else if (type === 'followup') {
                const { error } = await supabaseClient
                    .from('followups')
                    .insert({
                        due_date: item.date,
                        client: item.client,
                        task: item.task,
                        priority: item.priority || 'medium',
                        contact_name: item.contact
                    });
                return !error;
            }
        } catch (e) {
            console.log('Supabase comms save error:', e);
        }
        return false;
    },

    async seedSupabaseFromDefaults() {
        if (!await this.isSupabaseAvailable()) return false;

        try {
            // Check if data already exists
            const { data: existing } = await supabaseClient
                .from('communications')
                .select('id')
                .limit(1);

            if (existing && existing.length > 0) {
                console.log('Supabase comms already seeded');
                return true;
            }

            // Seed sent emails
            for (const item of defaultCommsData.sent) {
                await supabaseClient.from('communications').insert({
                    comm_type: 'sent',
                    comm_date: item.date.replace(' ', 'T') + ':00Z',
                    client: item.client,
                    subject: item.subject,
                    contact_name: item.to
                });
            }

            // Seed received emails
            for (const item of defaultCommsData.received) {
                await supabaseClient.from('communications').insert({
                    comm_type: 'received',
                    comm_date: item.date.replace(' ', 'T') + ':00Z',
                    client: item.client,
                    subject: item.subject,
                    contact_name: item.from
                });
            }

            // Seed followups
            for (const item of defaultCommsData.followups) {
                await supabaseClient.from('followups').insert({
                    due_date: item.date,
                    client: item.client,
                    task: item.task,
                    priority: item.priority,
                    contact_name: item.contact
                });
            }

            console.log('Supabase comms seeded successfully');
            return true;
        } catch (e) {
            console.log('Supabase seed error:', e);
            return false;
        }
    }
};

async function loadCommsData() {
    // Try Supabase first
    const supabaseData = await CommsService.loadFromSupabase();
    if (supabaseData && (supabaseData.sent.length > 0 || supabaseData.received.length > 0)) {
        commsData = supabaseData;
        commsDataSource = 'supabase';
        console.log('Loaded comms from Supabase');
    } else {
        // Try localStorage
        const cached = localStorage.getItem('comms_data');
        if (cached) {
            try {
                commsData = JSON.parse(cached);
                commsDataSource = 'localStorage';
                console.log('Loaded comms from localStorage');
            } catch (e) {
                commsData = JSON.parse(JSON.stringify(defaultCommsData));
                commsDataSource = 'default';
            }
        } else {
            commsData = JSON.parse(JSON.stringify(defaultCommsData));
            commsDataSource = 'default';
        }

        // Try to seed Supabase with defaults
        if (await CommsService.isSupabaseAvailable()) {
            await CommsService.seedSupabaseFromDefaults();
        }
    }

    // Cache to localStorage
    localStorage.setItem('comms_data', JSON.stringify(commsData));

    updateCommsDataSourceIndicator();
}

function updateCommsDataSourceIndicator() {
    const indicator = document.getElementById('commsDataSource');
    if (indicator) {
        if (commsDataSource === 'supabase') {
            indicator.innerHTML = '<span style="color: #17bf63;">● Supabase</span>';
        } else if (commsDataSource === 'localStorage') {
            indicator.innerHTML = '<span style="color: #f5a623;">● Local Cache</span>';
        } else {
            indicator.innerHTML = '<span style="color: var(--text-muted);">● Default Data</span>';
        }
    }
}

async function renderCommsTab() {
    await loadCommsData();
    renderActivityTimeline();
    renderFollowupTimeline();
    renderEmailLists();
    renderClientSummary();
}

function renderActivityTimeline() {
    const container = document.getElementById('activityTimeline');
    if (!container) return;
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(date);
    }
    const allEmails = [...(commsData.sent || []), ...(commsData.received || [])];
    container.innerHTML = days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayEmails = allEmails.filter(e => e.date && e.date.startsWith(dateStr));
        const sentCount = (commsData.sent || []).filter(e => e.date && e.date.startsWith(dateStr)).length;
        const isToday = dateStr === today.toISOString().split('T')[0];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const height = Math.min(80, Math.max(20, dayEmails.length * 15));
        const bgColor = dayEmails.length > 0 ? (sentCount > 0 ? 'rgba(23, 191, 99, 0.3)' : 'rgba(69, 183, 209, 0.3)') : 'var(--bg-secondary)';
        return `<div style="min-width: 60px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px; background: ${isToday ? 'var(--accent-dim)' : 'var(--bg-secondary)'}; border-radius: 8px; border: ${isToday ? '2px solid var(--accent)' : '1px solid var(--border)'}; opacity: ${isWeekend ? '0.6' : '1'};">
            <div style="font-size: 10px; color: var(--text-muted);">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div style="font-size: 16px; font-weight: 600; color: ${isToday ? 'var(--accent)' : 'var(--text-primary)'};">${date.getDate()}</div>
            <div style="font-size: 9px; color: var(--text-muted);">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
            <div style="width: 40px; height: ${height}px; background: ${bgColor}; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 4px;">
                ${dayEmails.length > 0 ? `<span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${dayEmails.length}</span><span style="font-size: 8px; color: var(--text-muted);">emails</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderFollowupTimeline() {
    const container = document.getElementById('followupTimeline');
    const listContainer = document.getElementById('followupList');
    if (!container) return;
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        days.push(date);
    }
    const followups = commsData.followups || [];
    container.innerHTML = days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayFollowups = followups.filter(f => f.date === dateStr);
        const isToday = dateStr === today.toISOString().split('T')[0];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const hasHigh = dayFollowups.some(f => f.priority === 'high');
        return `<div style="min-width: 70px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 8px; background: ${isToday ? 'var(--accent-dim)' : 'var(--bg-card)'}; border-radius: 8px; border: ${hasHigh ? '2px solid var(--warning)' : isToday ? '2px solid var(--accent)' : '1px solid var(--border)'}; opacity: ${isWeekend ? '0.5' : '1'};" title="${dayFollowups.map(f => f.client + ': ' + f.task).join('\n')}">
            <div style="font-size: 10px; color: var(--text-muted);">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div style="font-size: 18px; font-weight: 700; color: ${isToday ? 'var(--accent)' : hasHigh ? 'var(--warning)' : 'var(--text-primary)'};">${date.getDate()}</div>
            <div style="font-size: 9px; color: var(--text-muted);">${date.toLocaleDateString('en-US', { month: 'short' })}</div>
            ${dayFollowups.length > 0 ? `<div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 2px; justify-content: center;">${dayFollowups.map(f => `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${f.priority === 'high' ? 'var(--danger)' : f.priority === 'medium' ? 'var(--warning)' : 'var(--success)'};"></span>`).join('')}</div>` : ''}
        </div>`;
    }).join('');
    if (listContainer) {
        listContainer.innerHTML = followups.map(f => {
            const priorityColor = f.priority === 'high' ? 'var(--danger)' : f.priority === 'medium' ? 'var(--warning)' : 'var(--success)';
            return `<div style="background: var(--bg-secondary); border-radius: 10px; padding: 16px; border-left: 4px solid ${priorityColor};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: var(--text-primary);">${f.client}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">${f.date}</span>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">${f.task}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; color: var(--accent);">${f.contact}</span>
                    <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: ${priorityColor}20; color: ${priorityColor}; text-transform: uppercase;">${f.priority}</span>
                </div>
            </div>`;
        }).join('');
    }
}

function renderEmailLists() {
    const sentContainer = document.getElementById('sentEmailsList');
    const recvContainer = document.getElementById('receivedEmailsList');
    const sent = commsData.sent || [];
    const received = commsData.received || [];

    if (sentContainer) {
        sentContainer.innerHTML = sent.map(e => `<div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #45b7d120; color: #45b7d1;">${e.client}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${e.date}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${e.subject}</div>
            <div style="font-size: 11px; color: var(--text-muted);">To: ${e.to}</div>
        </div>`).join('');
    }
    if (recvContainer) {
        recvContainer.innerHTML = received.map(e => `<div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #17bf6320; color: #17bf63;">${e.client}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${e.date}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-primary); font-weight: 500;">${e.subject}</div>
            <div style="font-size: 11px; color: var(--text-muted);">From: ${e.from}</div>
        </div>`).join('');
    }
}

function renderClientSummary() {
    const container = document.getElementById('clientSummaryCards');
    if (!container) return;
    const clients = {};
    const sent = commsData.sent || [];
    const received = commsData.received || [];
    const allEmails = [...sent, ...received];
    allEmails.forEach(e => {
        if (!clients[e.client]) clients[e.client] = { sent: 0, received: 0, lastContact: e.date };
        if (sent.includes(e)) clients[e.client].sent++;
        else clients[e.client].received++;
        if (e.date > clients[e.client].lastContact) clients[e.client].lastContact = e.date;
    });
    container.innerHTML = Object.entries(clients).sort((a, b) => b[1].sent + b[1].received - (a[1].sent + a[1].received)).map(([client, data]) => `<div style="background: var(--bg-card); border-radius: 12px; padding: 16px; border: 1px solid var(--border);">
        <div style="font-weight: 600; color: var(--accent); margin-bottom: 12px;">${client}</div>
        <div style="display: flex; gap: 16px; margin-bottom: 8px;">
            <div><span style="font-size: 20px; font-weight: 700; color: #17bf63;">${data.sent}</span><span style="font-size: 11px; color: var(--text-muted);"> sent</span></div>
            <div><span style="font-size: 20px; font-weight: 700; color: #45b7d1;">${data.received}</span><span style="font-size: 11px; color: var(--text-muted);"> received</span></div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Last contact: ${data.lastContact ? data.lastContact.split(' ')[0] : 'N/A'}</div>
    </div>`).join('');
}

async function refreshCommsData() {
    await loadCommsData();
    renderActivityTimeline();
    renderFollowupTimeline();
    renderEmailLists();
    renderClientSummary();
}

function filterComms() {
    renderCommsTab();
}

// Hook into tab switching to render comms when visible
document.addEventListener('DOMContentLoaded', () => {
    const origSwitchTab = window.switchTab;
    if (origSwitchTab) {
        window.switchTab = function(tabName) {
            origSwitchTab(tabName);
            if (tabName === 'comms') renderCommsTab();
        };
    }
});
