document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DATA_URL = 'data/shipments_by_day.json';
    // This now controls how many ROWS of the weekly grid are shown per slide.
    const ROWS_PER_SLIDE = 10; 
    const SLIDER_INTERVAL = 10000; // 10 seconds

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

            // Build the new grid-based slides
            createGridSlides(dataByDay);

        } catch (error) {
            console.error('Failed to load shipment data:', error);
            container.innerHTML = `<div class="flex items-center justify-center h-full"><p class="text-2xl text-red-500">Error loading data. Please check the console.</p></div>`;
        }
    }

    /**
     * Creates slides with a 7-column weekly grid table.
     * @param {object} data - The shipment data grouped by day of the week.
     */
    function createGridSlides(data) {
        const container = document.getElementById('slider-container');
        container.innerHTML = ''; // Clear loading message

        const daysOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        // Find the maximum number of shipments on any single day to determine the total number of rows needed.
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

        // Generate all the HTML table rows for the entire grid.
        const allGridRows = [];
        for (let i = 0; i < maxRows; i++) {
            let rowHtml = '<tr>';
            daysOrder.forEach(day => {
                const shipment = data[day] ? data[day][i] : null;
                if (shipment) {
                    // Each cell contains the full shipment details.
                    rowHtml += `
                        <td class="has-data">
                            <div class="shipment-customer">${shipment.customer}</div>
                            <div class="shipment-reference">${shipment.reference}</div>
                            <div class="shipment-arrival">Arrival: ${shipment.arrival}</div>
                            <div class="shipment-departure">Departure: ${shipment.departure}</div>
                        </td>`;
                } else {
                    rowHtml += '<td></td>'; // Add an empty cell if no shipment exists for this slot.
                }
            });
            rowHtml += '</tr>';
            allGridRows.push(rowHtml);
        }

        // Create slides, each containing a chunk of the grid rows.
        for (let i = 0; i < allGridRows.length; i += ROWS_PER_SLIDE) {
            const slideChunk = allGridRows.slice(i, i + ROWS_PER_SLIDE);
            
            const slide = document.createElement('div');
            slide.className = 'slide';

            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'table-wrapper';

            const table = document.createElement('table');
            table.className = 'data-table';

            // Create the 7-day table header.
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
            tbody.innerHTML = slideChunk.join(''); // Add the generated rows to the table body
            table.appendChild(tbody);
            
            tableWrapper.appendChild(table);
            slide.appendChild(tableWrapper);
            container.appendChild(slide);
        }
        
        setupSlider();
    }

    /**
     * Initializes and controls the automatic slide transitions.
     */
    function setupSlider() {
        const slides = document.querySelectorAll('#slider-container .slide');
        if (slides.length === 0) return;

        let currentSlide = 0;

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
        };

        showSlide(currentSlide);

        if (slides.length > 1) {
            setInterval(() => {
                currentSlide = (currentSlide + 1) % slides.length;
                showSlide(currentSlide);
            }, SLIDER_INTERVAL);
        }
    }

    // Initial call to start the process.
    loadAndDisplayData();
});
