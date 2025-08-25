document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    // Reverted to the original DATA_URL as requested.
    const DATA_URL = 'data/shipments_by_day.json';

    /**
     * Fetches data, processes it, and builds the vertical table.
     */
    async function loadAndDisplayData() {
        const container = document.getElementById('slider-container');
        if (!container) {
            console.error('Error: Container element with id "slider-container" not found.');
            return;
        }

        try {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            // The data is expected to be an object with days as keys.
            // e.g., { "Sunday": [...], "Monday": [...], ... }
            const dataByDay = await response.json();

            // Hide the initial loading message
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.parentElement.style.display = 'none';
            }

            // **MODIFICATION**: Convert the object of arrays into a single flat array.
            // This makes the original data structure compatible with the new processing logic.
            const allShipments = Object.values(dataByDay).flat();

            // Process and group the data by the new date categories
            const groupedData = processAndGroupShipments(allShipments);

            // Build the new vertical table
            createVerticalTable(groupedData);

        } catch (error) {
            console.error('Failed to load shipment data:', error);
            container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%;"><p style="font-size: 1.5rem; color: red;">Error loading data. Please check the console.</p></div>`;
        }
    }

    /**
     * Groups all shipments into 9 date-based categories.
     * @param {Array} allShipments - A flat array of all shipment objects.
     * @returns {Array} An array of 9 objects, each with a title and a list of shipments.
     */
    function processAndGroupShipments(allShipments) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date to midnight for accurate comparisons

        // Create 9 "buckets" to hold shipments for each row
        const groups = [
            { title: "Overdue", shipments: [] }, // 0: Past
            { title: "Today", shipments: [] },   // 1: Today
            { title: "D+1", shipments: [] },     // 2: Tomorrow
            { title: "D+2", shipments: [] },
            { title: "D+3", shipments: [] },
            { title: "D+4", shipments: [] },
            { title: "D+5", shipments: [] },
            { title: "D+6", shipments: [] },
            { title: "Future", shipments: [] }  // 8: D+7 and beyond
        ];

        allShipments.forEach(shipment => {
            // Use arrival date, fallback to departure date
            const dateStr = shipment.arrival || shipment.departure;
            if (!dateStr) return; // Skip if no date is available

            const shipmentDate = new Date(dateStr);
            shipmentDate.setHours(0, 0, 0, 0); // Normalize shipment date

            const diffTime = shipmentDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                groups[0].shipments.push(shipment); // Overdue
            } else if (diffDays === 0) {
                groups[1].shipments.push(shipment); // Today
            } else if (diffDays >= 1 && diffDays <= 6) {
                groups[diffDays + 1].shipments.push(shipment); // D+1 to D+6
            } else if (diffDays >= 7) {
                groups[8].shipments.push(shipment); // Future
            }
        });

        // Add formatted dates to titles for D+1 to D+6
        for (let i = 2; i <= 7; i++) {
             const date = new Date(today);
             date.setDate(today.getDate() + (i - 1));
             const dateString = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
             groups[i].title = `D+${i - 1}<br><span style="font-size: 1rem;">(${dateString})</span>`;
        }
        
        const todayDate = new Date(today);
        const todayDateString = `${(todayDate.getMonth() + 1).toString().padStart(2, '0')}/${todayDate.getDate().toString().padStart(2, '0')}`;
        groups[1].title = `Today<br><span style="font-size: 1rem;">(${todayDateString})</span>`;


        return groups;
    }

    /**
     * Creates the 9-row vertical table and initiates scrolling animations.
     * @param {Array} groupedData - The processed and grouped shipment data.
     */
    function createVerticalTable(groupedData) {
        const container = document.getElementById('slider-container');
        container.innerHTML = ''; // Clear container

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'vertical-table-wrapper';

        const table = document.createElement('table');
        table.className = 'data-table-vertical';

        const tbody = document.createElement('tbody');

        groupedData.forEach(group => {
            const tr = document.createElement('tr');

            // 1. Create Date Header Cell (<th>)
            const th = document.createElement('th');
            th.className = 'date-header-cell';
            th.innerHTML = group.title;
            tr.appendChild(th);

            // 2. Create Shipment Data Cell (<td>)
            const td = document.createElement('td');
            td.className = 'shipment-data-cell';

            // 3. Create the scrolling container inside the <td>
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'shipment-items-container';

            // 4. Populate with shipment items
            if (group.shipments.length > 0) {
                group.shipments.forEach(shipment => {
                    const item = document.createElement('div');
                    item.className = 'shipment-item';
                    item.innerHTML = `
                        <div class="shipment-customer">${shipment.customer || ''}</div>
                        <div class="shipment-reference">${shipment.reference || ''}</div>
                        <div class="shipment-dates">
                            <span>Arr: ${shipment.arrival || 'N/A'}</span>
                            <span>Dep: ${shipment.departure || 'N/A'}</span>
                        </div>
                    `;
                    itemsContainer.appendChild(item);
                });
            } else {
                 itemsContainer.innerHTML = `<span style="color: #adb5bd; padding-left: 1rem;">No shipments</span>`;
            }

            td.appendChild(itemsContainer);
            tr.appendChild(td);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        container.appendChild(tableWrapper);

        // After the table is in the DOM, check for overflows and start animations
        startHorizontalScrolling();
    }

    /**
     * Finds overflowing rows and applies a horizontal scrolling animation.
     */
    function startHorizontalScrolling() {
        const containers = document.querySelectorAll('.shipment-items-container');
        containers.forEach(container => {
            // Check if the content's total width is greater than the cell's visible width
            if (container.scrollWidth > container.clientWidth) {
                const scrollDistance = -(container.scrollWidth - container.clientWidth);

                // Calculate animation duration based on how much content is hidden.
                const duration = Math.abs(scrollDistance) * 0.05; // Adjust 0.05 to make scroll faster/slower

                container.style.setProperty('--scroll-width', `${scrollDistance}px`);
                container.style.animationDuration = `${Math.max(15, duration)}s`; // Minimum 15 seconds duration
                container.classList.add('scrolling-content');
            }
        });
    }

    // Initial call to start the process.
    loadAndDisplayData();
});
