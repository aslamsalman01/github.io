/**
 * CALL CENTER DASHBOARD - MAIN APPLICATION
 * Organized and modular approach
 */

// Configuration Constants
const TIME_SLOTS = [
    "8h30-9h00", "9h00-9h30", "9h30-10h00", "10h00-10h30",
    "10h30-11h00", "11h00-11h30", "11h30-12h00", "12h00-12h30",
    "12h30-13h00", "13h00-13h30", "13h30-14h00", "14h00-14h30",
    "14h30-15h00", "15h00-15h30", "15h30-16h00", "16h00-16h30",
    "16h30-17h00", "17h00-17h30", "17h30-18h00", "18h00-18h30"
];

const SHIFTS = {
    A: { start: 8.5, end: 17.5, hours: 9, break: 1.5 },
    B: { start: 11, end: 19, hours: 8, break: 1.5 },
    C: { start: 9, end: 19, hours: 10, break: 1.5 }
};

class CallCenterDashboard {
    constructor() {
        this.config = {
            shifts: {
                A: { count: 25, ...SHIFTS.A },
                B: { count: 25, ...SHIFTS.B },
                C: { count: 30, ...SHIFTS.C }
            },
            aht: 10, // minutes
            occupancy: 0.85,
            dailyTarget: 700
        };

        this.data = {
            commands: {},
            agents: [],
            agentDetails: {},
            slotTotals: {}
        };

        this.init();
    }

    // Initialize application
    init() {
        this.setCurrentDate();
        this.initializeData();
        this.renderAll();
        this.setupEventListeners();
    }

    // Set current date in header
    setCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR', options);
    }

    // Initialize data structures
    initializeData() {
        // Initialize commands
        TIME_SLOTS.forEach(slot => {
            this.data.commands[slot] = 0;
        });

        // Initialize agents
        this.generateAgents();

        // Initialize slot totals
        TIME_SLOTS.forEach(slot => {
            this.data.slotTotals[slot] = 0;
        });
    }

    // Update configuration from UI
    updateConfiguration() {
        this.config.shifts.A.count = parseInt(document.getElementById('shiftA').value) || 0;
        this.config.shifts.B.count = parseInt(document.getElementById('shiftB').value) || 0;
        this.config.shifts.C.count = parseInt(document.getElementById('shiftC').value) || 0;
        this.config.aht = parseInt(document.getElementById('ahtInput').value) || 10;
        this.config.dailyTarget = parseInt(document.getElementById('dailyTarget').value) || 700;

        // Update UI
        const totalAgents = this.getTotalAgents();
        document.getElementById('totalAgentsCount').textContent = totalAgents;
        document.getElementById('summaryTotalAgents').textContent = totalAgents;
        document.getElementById('summaryTotalCalls').textContent = this.config.dailyTarget;

        // Regenerate data
        this.generateAgents();
        this.renderAll();

        this.showNotification('Configuration updated successfully!', 'success');
    }

    // Calculate agents present in a time slot
    calculateAgentsPresent(timeSlot) {
        let agents = 0;
        const slotStart = this.parseTimeSlot(timeSlot);

        if (slotStart >= SHIFTS.A.start && slotStart < SHIFTS.A.end) {
            agents += this.config.shifts.A.count;
        }
        if (slotStart >= SHIFTS.B.start && slotStart < SHIFTS.B.end) {
            agents += this.config.shifts.B.count;
        }
        if (slotStart >= SHIFTS.C.start && slotStart < SHIFTS.C.end) {
            agents += this.config.shifts.C.count;
        }

        return agents;
    }

    // Calculate capacity for a time slot
    calculateCapacity(timeSlot) {
        const agentsPresent = this.calculateAgentsPresent(timeSlot);
        // Capacity = agents * (30min / AHT) * occupancy rate
        const capacity = agentsPresent * (30 / this.config.aht) * this.config.occupancy;
        return Math.floor(capacity);
    }

    // Parse time slot to decimal
    parseTimeSlot(timeSlot) {
        return parseFloat(timeSlot.split('-')[0].replace('h', '.'));
    }

    // Get total agents
    getTotalAgents() {
        return this.config.shifts.A.count + this.config.shifts.B.count + this.config.shifts.C.count;
    }

    // Generate agents list
    generateAgents() {
        this.data.agents = [];
        let agentId = 1;

        // Shift A agents
        for (let i = 0; i < this.config.shifts.A.count; i++) {
            this.data.agents.push({
                id: `A${agentId.toString().padStart(3, '0')}`,
                shift: 'A',
                hours: this.config.shifts.A.hours - this.config.shifts.A.break,
                callsTreated: 0,
                callsBySlot: {}
            });
            agentId++;
        }

        // Shift B agents
        for (let i = 0; i < this.config.shifts.B.count; i++) {
            this.data.agents.push({
                id: `B${agentId.toString().padStart(3, '0')}`,
                shift: 'B',
                hours: this.config.shifts.B.hours - this.config.shifts.B.break,
                callsTreated: 0,
                callsBySlot: {}
            });
            agentId++;
        }

        // Shift C agents
        for (let i = 0; i < this.config.shifts.C.count; i++) {
            this.data.agents.push({
                id: `C${agentId.toString().padStart(3, '0')}`,
                shift: 'C',
                hours: this.config.shifts.C.hours - this.config.shifts.C.break,
                callsTreated: 0,
                callsBySlot: {}
            });
            agentId++;
        }
    }

isAgentPresentInSlot(agent, timeSlot) {
    if (agent.status !== 'present') return false;
    
    const slotStart = this.parseTimeSlotToDecimal(timeSlot);
    const slotEnd = this.parseTimeSlotEnd(timeSlot); // Nouveau: besoin de la fin du créneau
    const team = this.config.teams[agent.team];
    
    const teamStart = this.parseTimeToDecimal(team.start);
    const teamEnd = this.parseTimeToDecimal(team.end);
    
    // Un agent est présent si le créneau chevauche ses heures de travail
    // Il travaille si: (slotStart >= teamStart && slotStart < teamEnd) 
    // OU (slotEnd > teamStart && slotEnd <= teamEnd)
    // OU (slotStart < teamStart && slotEnd > teamEnd) pour les longs créneaux
    return (slotStart >= teamStart && slotStart < teamEnd) || 
           (slotEnd > teamStart && slotEnd <= teamEnd) ||
           (slotStart < teamStart && slotEnd > teamEnd);
}

// Ajouter cette fonction pour obtenir la fin du créneau
parseTimeSlotEnd(timeSlot) {
    const endTime = timeSlot.split('-')[1];
    // Convertir "9h00" en 9.0
    return parseFloat(endTime.replace('h', '.'));
}

calculateAgentsPresent(slot) {
    let totalAgents = 0;
    const slotStart = this.parseTimeSlotToDecimal(slot);
    const slotEnd = this.parseTimeSlotEnd(slot);

    Object.values(this.config.teams).forEach(team => {
        const teamStart = this.parseTimeToDecimal(team.start);
        const teamEnd = this.parseTimeToDecimal(team.end);
        
        // Vérifier si le créneau chevauche les heures de l'équipe
        if ((slotStart >= teamStart && slotStart < teamEnd) ||
            (slotEnd > teamStart && slotEnd <= teamEnd) ||
            (slotStart < teamStart && slotEnd > teamEnd)) {
            totalAgents += team.present;
        }
    });

    return totalAgents;
}

    // Render commands table
    renderCommandsTable() {
        const tableBody = document.getElementById('commandsBody');
        tableBody.innerHTML = '';

        let totalAgents = 0;
        let totalCommands = 0;
        let totalCapacity = 0;

        TIME_SLOTS.forEach((slot, index) => {
            const agentsPresent = this.calculateAgentsPresent(slot);
            const capacity = this.calculateCapacity(slot);
            const commandValue = this.data.commands[slot] || 0;
            const difference = capacity - commandValue;
            const status = this.getStatus(difference, commandValue);

            totalAgents += agentsPresent;
            totalCommands += commandValue;
            totalCapacity += capacity;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${slot}</strong></td>
                <td><span class="badge bg-info">${agentsPresent}</span></td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${commandValue}" min="0"
                           onchange="CallCenterDashboard.updateCommand(${index}, this.value)">
                </td>
                <td><span class="badge bg-primary">${capacity}</span></td>
                <td>
                    <span class="badge ${difference >= 0 ? 'bg-success' : 'bg-danger'}">
                        ${difference >= 0 ? '+' : ''}${difference}
                    </span>
                </td>
                <td><span class="badge bg-${status.color}">${status.text}</span></td>
            `;
            tableBody.appendChild(row);
        });

        // Update totals
        const totalDifference = totalCapacity - totalCommands;
        const coverage = totalCapacity > 0 ? Math.round((totalCommands / totalCapacity) * 100) : 0;

        document.getElementById('commandsTotalAgents').textContent = totalAgents;
        document.getElementById('commandsTotal').textContent = totalCommands;
        document.getElementById('commandsCapacity').textContent = totalCapacity;
        document.getElementById('commandsDifference').textContent = totalDifference;
        
        const statusBadge = document.getElementById('commandsStatus');
        statusBadge.className = `badge bg-${coverage <= 100 ? 'success' : 'danger'}`;
        statusBadge.textContent = coverage <= 100 ? 'OK' : 'Overloaded';

        // Update summary
        document.getElementById('summaryCapacity').textContent = totalCapacity;
        document.getElementById('summaryCoverage').textContent = `${Math.min(coverage, 100)}%`;
    }

    // Get status based on difference
    getStatus(difference, command) {
        if (command === 0) return { color: 'secondary', text: 'Pending' };
        if (difference >= command * 0.3) return { color: 'success', text: 'Excellent' };
        if (difference >= 0) return { color: 'info', text: 'Good' };
        if (difference >= -command * 0.3) return { color: 'warning', text: 'Warning' };
        return { color: 'danger', text: 'Critical' };
    }

    // Update a command
    static updateCommand(index, value) {
        const slot = TIME_SLOTS[index];
        const numValue = parseInt(value) || 0;
        dashboard.data.commands[slot] = numValue;
        dashboard.renderAll();
    }

    // Auto-distribute commands
    autoDistribute() {
        const totalAgents = this.getTotalAgents();
        const target = this.config.dailyTarget;

        // Distribute based on agents present in each slot
        TIME_SLOTS.forEach(slot => {
            const agentsPresent = this.calculateAgentsPresent(slot);
            const share = agentsPresent / totalAgents;
            this.data.commands[slot] = Math.round(target * share);
        });

        this.renderAll();
        this.showNotification('Commands auto-distributed successfully!', 'success');
    }

    // Clear all commands
    clearCommands() {
        if (confirm('Are you sure you want to clear all commands?')) {
            TIME_SLOTS.forEach(slot => {
                this.data.commands[slot] = 0;
            });
            this.renderAll();
            this.showNotification('All commands cleared!', 'info');
        }
    }

    // Calculate commands
    calculateCommands() {
        this.calculateAgentDetails();
        this.renderAll();
        this.showNotification('Commands calculated successfully!', 'success');
    }

    // Calculate agent details (distribution)
    calculateAgentDetails() {
        // Reset data
        this.data.agentDetails = {};
        this.data.agents.forEach(agent => {
            agent.callsTreated = 0;
            agent.callsBySlot = {};
        });

        TIME_SLOTS.forEach(slot => {
            this.data.slotTotals[slot] = 0;
        });

        // Distribute calls for each time slot
        TIME_SLOTS.forEach(slot => {
            const slotCommand = this.data.commands[slot] || 0;
            const agentsPresent = this.calculateAgentsPresent(slot);

            if (agentsPresent > 0 && slotCommand > 0) {
                const baseCalls = Math.floor(slotCommand / agentsPresent);
                const extraCalls = slotCommand % agentsPresent;

                // Find agents present in this slot
                const presentAgents = this.data.agents.filter(agent => 
                    this.isAgentPresentInSlot(agent.id, slot)
                );

                // Distribute calls
                presentAgents.forEach((agent, index) => {
                    const callsForAgent = baseCalls + (index < extraCalls ? 1 : 0);
                    
                    if (!agent.callsBySlot[slot]) {
                        agent.callsBySlot[slot] = 0;
                    }
                    agent.callsBySlot[slot] += callsForAgent;
                    agent.callsTreated += callsForAgent;
                    this.data.slotTotals[slot] += callsForAgent;
                });
            }
        });
    }

    // Render agent performance table
    renderAgentsTable() {
        const tableBody = document.getElementById('agentsBody');
        tableBody.innerHTML = '';

        let totalCalls = 0;
        let totalHours = 0;

        this.data.agents.forEach(agent => {
            const productivity = agent.hours > 0 ? (agent.callsTreated / agent.hours).toFixed(1) : 0;
            const achievement = this.config.dailyTarget > 0 ? 
                Math.round((agent.callsTreated / (this.config.dailyTarget / this.data.agents.length)) * 100) : 0;

            totalCalls += agent.callsTreated;
            totalHours += agent.hours;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${agent.id}</strong></td>
                <td>
                    <span class="badge ${agent.shift === 'A' ? 'bg-primary' : agent.shift === 'B' ? 'bg-success' : 'bg-warning'}">
                        Shift ${agent.shift}
                    </span>
                </td>
                <td>${agent.hours}h</td>
                <td><span class="badge bg-info">${agent.callsTreated}</span></td>
                <td>${productivity} calls/h</td>
                <td>
                    <div class="progress">
                        <div class="progress-bar ${achievement >= 100 ? 'bg-success' : achievement >= 80 ? 'bg-info' : achievement >= 50 ? 'bg-warning' : 'bg-danger'}" 
                             style="width: ${Math.min(achievement, 100)}%">
                            ${achievement}%
                        </div>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Update averages
        const avgCalls = this.data.agents.length > 0 ? Math.round(totalCalls / this.data.agents.length) : 0;
        const avgHours = this.data.agents.length > 0 ? (totalHours / this.data.agents.length).toFixed(1) : 0;
        const avgProductivity = avgHours > 0 ? (avgCalls / avgHours).toFixed(1) : 0;
        const avgAchievement = this.config.dailyTarget > 0 ? 
            Math.round((totalCalls / this.config.dailyTarget) * 100) : 0;

        document.getElementById('avgCalls').textContent = avgCalls;
        document.getElementById('avgProductivity').textContent = `${avgProductivity} calls/h`;
        document.getElementById('avgAchievement').textContent = `${avgAchievement}%`;
    }

    // Render detailed agent/time slot matrix
    renderAgentDetailsTable() {
        // Update time slots header
        const timeSlotsHeader = document.getElementById('timeSlotsHeader');
        timeSlotsHeader.innerHTML = '';
        
        TIME_SLOTS.forEach(slot => {
            const th = document.createElement('th');
            th.textContent = slot.split('-')[0];
            th.title = slot;
            th.style.fontSize = '0.8rem';
            th.style.textAlign = 'center';
            timeSlotsHeader.appendChild(th);
        });

        // Update agent filter
        const agentFilter = document.getElementById('agentFilter');
        agentFilter.innerHTML = '<option value="all">All Agents</option>';
        
        this.data.agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.id;
            agentFilter.appendChild(option);
        });

        // Render agent rows
        const tableBody = document.getElementById('agentDetailsBody');
        tableBody.innerHTML = '';

        this.data.agents.forEach(agent => {
            const row = document.createElement('tr');
            row.className = 'agent-detail-row';
            row.dataset.agentId = agent.id;
            row.dataset.shift = agent.shift;

            // Agent ID cell
            const cellAgent = document.createElement('td');
            cellAgent.innerHTML = `<strong>${agent.id}</strong>`;

            // Shift cell
            const cellShift = document.createElement('td');
            cellShift.innerHTML = `
                <span class="badge ${agent.shift === 'A' ? 'bg-primary' : agent.shift === 'B' ? 'bg-success' : 'bg-warning'}">
                    ${agent.shift}
                </span>
            `;

            row.appendChild(cellAgent);
            row.appendChild(cellShift);

            // Time slot cells
            TIME_SLOTS.forEach(slot => {
                const cell = document.createElement('td');
                cell.style.textAlign = 'center';
                cell.style.padding = '4px';

                const calls = agent.callsBySlot[slot] || 0;
                const isPresent = this.isAgentPresentInSlot(agent.id, slot);

                if (!isPresent) {
                    cell.innerHTML = '<span class="badge bg-secondary">-</span>';
                    cell.title = `Not present: ${slot}`;
                } else {
                    const badgeClass = this.getCallsBadgeClass(calls);
                    cell.innerHTML = `<span class="badge ${badgeClass}">${calls}</span>`;
                    cell.title = `${agent.id}: ${calls} calls during ${slot}`;
                }

                row.appendChild(cell);
            });

            // Total cell
            const cellTotal = document.createElement('td');
            cellTotal.innerHTML = `<strong class="text-primary">${agent.callsTreated}</strong>`;
            cellTotal.style.textAlign = 'center';
            cellTotal.style.fontWeight = 'bold';

            row.appendChild(cellTotal);
            tableBody.appendChild(row);
        });

        // Render footer with totals
        this.renderAgentDetailsFooter();
    }

    // Get badge class based on calls count
    getCallsBadgeClass(calls) {
        if (calls === 0) return 'bg-secondary';
        if (calls <= 2) return 'bg-success';
        if (calls <= 5) return 'bg-warning';
        return 'bg-danger';
    }

    // Render agent details footer
    renderAgentDetailsFooter() {
        const footer = document.getElementById('agentDetailsFooter');
        footer.innerHTML = '';

        // Label cell
        const cellLabel = document.createElement('td');
        cellLabel.innerHTML = '<strong>TOTAL</strong>';
        cellLabel.colSpan = 2;
        footer.appendChild(cellLabel);

        // Time slot totals
        TIME_SLOTS.forEach(slot => {
            const cell = document.createElement('td');
            cell.style.textAlign = 'center';
            cell.style.fontWeight = 'bold';
            cell.style.backgroundColor = '#e9ecef';
            cell.textContent = this.data.slotTotals[slot] || 0;
            footer.appendChild(cell);
        });

        // Grand total
        const cellGrandTotal = document.createElement('td');
        const grandTotal = Object.values(this.data.slotTotals).reduce((a, b) => a + b, 0);
        cellGrandTotal.innerHTML = `<strong class="text-success">${grandTotal}</strong>`;
        cellGrandTotal.style.textAlign = 'center';
        cellGrandTotal.style.fontWeight = 'bold';
        cellGrandTotal.style.backgroundColor = '#d4edda';
        footer.appendChild(cellGrandTotal);
    }

    // Filter agent details table
    filterAgentDetails() {
        const agentFilter = document.getElementById('agentFilter').value;
        const shiftFilter = document.getElementById('detailShiftFilter').value;
        const rows = document.querySelectorAll('.agent-detail-row');

        rows.forEach(row => {
            const agentId = row.dataset.agentId;
            const shift = row.dataset.shift;

            const showAgent = (agentFilter === 'all' || agentId === agentFilter);
            const showShift = (shiftFilter === 'all' || shift === shiftFilter);

            row.style.display = (showAgent && showShift) ? '' : 'none';
        });
    }

    // Calculate all
    calculateAll() {
        this.calculateAgentDetails();
        this.renderAll();
        this.showNotification('All calculations completed successfully!', 'success');
    }

    // Export to Excel
    exportToExcel() {
        const workbook = XLSX.utils.book_new();
        
        // Sheet 1: Commands
        const commandsData = [
            ['COMMANDS PER TIME SLOT'],
            ['Time Slot', 'Agents Present', 'Director Command', 'Capacity', 'Difference', 'Status'],
            ...TIME_SLOTS.map(slot => [
                slot,
                this.calculateAgentsPresent(slot),
                this.data.commands[slot] || 0,
                this.calculateCapacity(slot),
                this.calculateCapacity(slot) - (this.data.commands[slot] || 0),
                this.getStatus(this.calculateCapacity(slot) - (this.data.commands[slot] || 0), this.data.commands[slot] || 0).text
            ])
        ];
        
        const commandsSheet = XLSX.utils.aoa_to_sheet(commandsData);
        XLSX.utils.book_append_sheet(workbook, commandsSheet, 'Commands');

        // Sheet 2: Agent Performance
        const agentsData = [
            ['AGENT PERFORMANCE'],
            ['Agent ID', 'Shift', 'Productive Hours', 'Calls Treated', 'Productivity (calls/h)', 'Achievement (%)'],
            ...this.data.agents.map(agent => [
                agent.id,
                `Shift ${agent.shift}`,
                agent.hours,
                agent.callsTreated,
                agent.hours > 0 ? (agent.callsTreated / agent.hours).toFixed(1) : 0,
                this.config.dailyTarget > 0 ? 
                    Math.round((agent.callsTreated / (this.config.dailyTarget / this.data.agents.length)) * 100) : 0
            ])
        ];
        
        const agentsSheet = XLSX.utils.aoa_to_sheet(agentsData);
        XLSX.utils.book_append_sheet(workbook, agentsSheet, 'Agents');

        // Sheet 3: Configuration
        const configData = [
            ['CONFIGURATION'],
            ['Parameter', 'Value'],
            ['Date', new Date().toLocaleDateString('fr-FR')],
            ['Daily Target', this.config.dailyTarget],
            ['Agents Shift A', this.config.shifts.A.count],
            ['Agents Shift B', this.config.shifts.B.count],
            ['Agents Shift C', this.config.shifts.C.count],
            ['Total Agents', this.getTotalAgents()],
            ['AHT', `${this.config.aht} minutes`],
            ['Occupancy Rate', `${Math.round(this.config.occupancy * 100)}%`]
        ];
        
        const configSheet = XLSX.utils.aoa_to_sheet(configData);
        XLSX.utils.book_append_sheet(workbook, configSheet, 'Configuration');

        // Generate filename and download
        const date = new Date().toISOString().split('T')[0];
        const filename = `call_center_planning_${date}.xlsx`;
        XLSX.writeFile(workbook, filename);

        this.showNotification(`File "${filename}" downloaded successfully!`, 'success');
    }

    // Export agent details
    exportAgentDetails() {
        const data = [];
        
        // Header
        const header = ['Agent ID', 'Shift', ...TIME_SLOTS, 'Total'];
        data.push(header);

        // Agent rows
        this.data.agents.forEach(agent => {
            const row = [agent.id, `Shift ${agent.shift}`];
            
            TIME_SLOTS.forEach(slot => {
                row.push(agent.callsBySlot[slot] || 0);
            });
            
            row.push(agent.callsTreated);
            data.push(row);
        });

        // Totals row
        const totalsRow = ['TOTAL', '', ...TIME_SLOTS.map(slot => this.data.slotTotals[slot] || 0)];
        const grandTotal = totalsRow.slice(2).reduce((a, b) => a + b, 0);
        totalsRow.push(grandTotal);
        data.push(totalsRow);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths
        const wscols = [
            {wch: 10}, {wch: 8},
            ...TIME_SLOTS.map(() => ({wch: 10})),
            {wch: 8}
        ];
        worksheet['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Agent Details');

        // Download
        const date = new Date().toISOString().split('T')[0];
        const filename = `agent_details_${date}.xlsx`;
        XLSX.writeFile(workbook, filename);

        this.showNotification(`Agent details exported to "${filename}"`, 'success');
    }

    // Render all components
    renderAll() {
        this.renderCommandsTable();
        this.renderAgentsTable();
        this.renderAgentDetailsTable();
    }

    // Show notification
    showNotification(message, type = 'info') {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    // Setup event listeners
    setupEventListeners() {
        // Shift inputs
        document.querySelectorAll('.shift-input').forEach(input => {
            input.addEventListener('change', () => this.updateConfiguration());
        });

        // AHT and Target inputs
        document.getElementById('ahtInput').addEventListener('change', () => this.updateConfiguration());
        document.getElementById('dailyTarget').addEventListener('change', () => this.updateConfiguration());
    }
}

// Initialize application
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new CallCenterDashboard();
    
    // Make dashboard accessible globally
    window.CallCenterDashboard = {
        updateConfiguration: () => dashboard.updateConfiguration(),
        calculateAll: () => dashboard.calculateAll(),
        autoDistribute: () => dashboard.autoDistribute(),
        clearCommands: () => dashboard.clearCommands(),
        calculateCommands: () => dashboard.calculateCommands(),
        filterAgentDetails: () => dashboard.filterAgentDetails(),
        exportToExcel: () => dashboard.exportToExcel(),
        exportAgentDetails: () => dashboard.exportAgentDetails(),
        updateCommand: (index, value) => dashboard.updateCommand(index, value)
    };
});