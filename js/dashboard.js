document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DATA_URL = 'data/shipments_by_day.json';

    /**
     * Fetches data and initiates the grid table creation.
     */
    async function loadAndDisplayData() {
        const container = document.getElementById('slider-container');
        if (!container) {
            console.error('Error: A container element with id "slider-container" was not found.');
            return;
        }

        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const dataByDay = await response.json();
            
            const loadingMessage = document.getElementById('loading-message');
            if(loadingMessage) {
                loadingMessage.style.display = 'none';
            }

            // Build the new grid table
            createAndAnimateGrid(dataByDay);

        } catch (error) {
            console.error('Failed to load shipment data:', error);
            container.innerHTML = `<div class="flex items-center justify-center h-full"><p class="text-2xl text-red-500">Error loading data. Please check the console.</p></div>`;
        }
    }

    /**
     * Creates a single, static 7-column grid table and initiates scrolling animations.
     * @param {object} data - The shipment data grouped by day of the week.
     */
    function createAndAnimateGrid(data) {
        const container = document.getElementById('slider-container');
        container.innerHTML = ''; // Clear loading message

        const daysOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        let maxRows = 0;
        daysOrder.forEach(day => {
            const dayCount = data[day] ? data[day].length : 0;
            if (dayCount > maxRows) {
                maxRows = dayCount;
            }
        });

        if (maxRows === 0) {
            container.innerHTML = `<div class="flex items-center justify-center h-full"><p class="text-2xl text-gray-500">No shipment data available.</p></div>`;
            return;
        }

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-wrapper';

        const table = document.createElement('table');
        table.className = 'data-table';

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Sunday</th>
                    <th>Monday</th>
                    <th>Tuesday</th>
                    <th>Wednesday</th>
                    <th>Thursday</th>
                    <th>Friday</th>
                    <th>Saturday</th>
                </tr>
            </thead>
        `;

        const tbody = document.createElement('tbody');
        for (let i = 0; i < maxRows; i++) {
            const tr = document.createElement('tr');
            let rowHtml = '';
            daysOrder.forEach(day => {
                const shipment = data[day] ? data[day][i] : null;
                if (shipment) {
                    rowHtml += `
                        <td class="has-data">
                            <div class="cell-content">
                                <div class="shipment-customer">${shipment.customer}</div>
                                <div class="shipment-reference">${shipment.reference}</div>
                                <div class="shipment-dates">
                                    <span class="shipment-arrival">Arrival: ${shipment.arrival}</span>
                                    <span class="shipment-departure">Departure: ${shipment.departure}</span>
                                </div>
                            </div>
                        </td>`;
                } else {
                    rowHtml += '<td></td>';
                }
            });
            tr.innerHTML = rowHtml;
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);
        
        // After the table is in the DOM, start the animations
        startScrollingAnimations();
    }

    /**
     * Finds all overflowing cells and applies a dynamic scrolling animation.
     */
    function startScrollingAnimations() {
        const cells = document.querySelectorAll('.data-table td.has-data');
        cells.forEach(cell => {
            const content = cell.querySelector('.cell-content');
            // Check if the content's actual height is greater than the cell's visible height
            if (content.scrollHeight > cell.clientHeight) {
                const scrollDistance = -(content.scrollHeight - cell.clientHeight);
                
                // Calculate animation duration based on how much content is hidden.
                // This makes longer lists scroll for a longer time.
                const duration = Math.abs(scrollDistance) * 0.1; // Adjust 0.1 to make scroll faster/slower
                
                content.style.setProperty('--scroll-height', `${scrollDistance}px`);
                content.style.animationDuration = `${Math.max(10, duration)}s`; // Minimum 10 seconds duration
                content.classList.add('scrolling-content');
            }
        });
    }

    // Initial call to start the process.
    loadAndDisplayData();
});
