document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
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
            const dataByDay = await response.json();

            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.parentElement.style.display = 'none';
            }

            const allShipments = Object.values(dataByDay).flat();
            const groupedData = processAndGroupShipments(allShipments);
            createVerticalTable(groupedData);

        } catch (error) {
            console.error('Failed to load shipment data:', error);
            container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%;"><p style="font-size: 1.5rem; color: red;">Error loading data. Please check the console.</p></div>`;
        }
    }

    /**
     * Groups all shipments into 9 date-based categories with new date formats.
     * @param {Array} allShipments - A flat array of all shipment objects.
     * @returns {Array} An array of 9 objects, each with a title and a list of shipments.
     */
    function processAndGroupShipments(allShipments) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const formatDateWithDay = (date) => {
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const dayOfMonth = date.getDate().toString().padStart(2, '0');
            const dayOfWeek = days[date.getDay()];
            return `${month}/${dayOfMonth}(${dayOfWeek})`;
        };

        const groups = [];
        // Create date headers from yesterday (i=-1) to D+7 (i=7)
        const dateHeaders = [];
        for (let i = -1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dateHeaders.push(formatDateWithDay(date));
        }

        // Initialize groups with the new title format
        groups.push({ title: `~ ${dateHeaders[0]}`, shipments: [] }); // Overdue (~ Yesterday)
        groups.push({ title: dateHeaders[1], shipments: [] });      // Today
        for (let i = 2; i <= 7; i++) { // D+1 to D+6
            groups.push({ title: dateHeaders[i], shipments: [] });
        }
        groups.push({ title: `${dateHeaders[8]} ~`, shipments: [] }); // Future (D+7 ~)

        allShipments.forEach(shipment => {
            const dateStr = shipment.arrival || shipment.departure;
            if (!dateStr) return;

            const shipmentDate = new Date(dateStr);
            shipmentDate.setHours(0, 0, 0, 0);

            const diffTime = shipmentDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                groups[0].shipments.push(shipment);
            } else if (diffDays === 0) {
                groups[1].shipments.push(shipment);
            } else if (diffDays >= 1 && diffDays <= 6) {
                groups[diffDays + 1].shipments.push(shipment);
            } else if (diffDays >= 7) {
                groups[8].shipments.push(shipment);
            }
        });

        return groups;
    }

    /**
     * Creates the 9-row vertical table and initiates scrolling animations.
     * @param {Array} groupedData - The processed and grouped shipment data.
     */
    function createVerticalTable(groupedData) {
        const container = document.getElementById('slider-container');
        container.innerHTML = '';

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'vertical-table-wrapper';

        const table = document.createElement('table');
        table.className = 'data-table-vertical';

        const tbody = document.createElement('tbody');

        groupedData.forEach(group => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.className = 'date-header-cell';
            th.innerHTML = group.title;
            tr.appendChild(th);

            const td = document.createElement('td');
            td.className = 'shipment-data-cell';

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'shipment-items-container';

            if (group.shipments.length > 0) {
                group.shipments.forEach(shipment => {
                    const item = document.createElement('div');
                    item.className = 'shipment-item';
                    // Changed Arr to ETA and Dep to ETD
                    item.innerHTML = `
                        <div class="shipment-customer">${shipment.customer || ''}</div>
                        <div class="shipment-reference">${shipment.reference || ''}</div>
                        <div class="shipment-dates">
                            <span>ETA: ${shipment.arrival || 'N/A'}</span>
                            <span>ETD: ${shipment.departure || 'N/A'}</span>
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

        startHorizontalScrolling();
    }

    /**
     * Finds overflowing rows, duplicates content for a seamless loop, and applies animation.
     */
    function startHorizontalScrolling() {
        const containers = document.querySelectorAll('.shipment-items-container');
        containers.forEach(container => {
            if (container.scrollWidth > container.clientWidth) {
                // Duplicate items for a seamless loop
                const originalItems = Array.from(container.children);
                originalItems.forEach(item => {
                    container.appendChild(item.cloneNode(true));
                });

                // The distance to scroll is now half of the new total width
                const scrollDistance = -container.scrollWidth / 2;
                
                // The rate of scroll (pixels per second) is constant
                const scrollRate = 50; // 50 pixels per second, adjust as needed
                const duration = Math.abs(scrollDistance) / scrollRate;

                // Set animation properties directly in JS for a non-alternating loop
                container.style.setProperty('--scroll-width', `${scrollDistance}px`);
                container.style.animation = `horizontal-scroll ${duration}s linear infinite`;
            }
        });
    }

    // Initial call to start the process.
    loadAndDisplayData();
});
