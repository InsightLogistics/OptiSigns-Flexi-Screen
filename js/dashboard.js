document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const DATA_URL = 'data/shipments_by_day.json';

    /**
     * Injects the correct CSS keyframes into the document head to ensure a seamless,
     * non-pausing linear scroll. This overrides any conflicting styles from external CSS.
     */
    function injectAnimationKeyframes() {
        const styleId = 'horizontal-scroll-keyframes';
        // Prevent injecting the style tag multiple times
        if (document.getElementById(styleId)) {
            return;
        }
        const style = document.createElement('style');
        style.id = styleId;
        // This keyframe definition creates a simple, continuous scroll from start to end.
        style.innerHTML = `
            @keyframes horizontal-scroll {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(var(--scroll-width));
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Fetches data, processes it, and builds the vertical table.
     */
    async function loadAndDisplayData() {
        // Inject the correct animation rules as soon as the script runs.
        injectAnimationKeyframes();

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
        const dateHeaders = [];
        for (let i = -1; i <= 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dateHeaders.push(formatDateWithDay(date));
        }

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
        if (!container) return;
    
        // 기존의 테이블 구조를 유지하면서 데이터만 채웁니다
        const rows = container.querySelectorAll('tr');
        
        groupedData.forEach((group, index) => {
            if (index >= rows.length) return;
            
            const row = rows[index];
            const dateHeader = row.querySelector('.date-header-cell');
            const itemsContainer = row.querySelector('.shipment-items-container');
            
            if (dateHeader) {
                dateHeader.textContent = group.title;
            }
            
            if (itemsContainer) {
                itemsContainer.innerHTML = ''; // 기존 내용 초기화
                
                if (group.shipments.length > 0) {
                    group.shipments.forEach((shipment, shipmentIndex) => {
                        const containerNumber = shipmentIndex + 1;
                        
                        // 기존 HTML 구조를 사용하여 아이템 생성
                        const item = document.createElement('div');
                        item.className = 'shipment-item';
                        
                        // customer, reference, dates는 기존대로
                        const customerElem = item.querySelector('.shipment-customer');
                        const referenceElem = item.querySelector('.shipment-reference');
                        const arrivalElem = item.querySelector('.shipment-arrival');
                        const departureElem = item.querySelector('.shipment-departure');
                        const containerNumberElem = item.querySelector('.container-number');
                        const typeElem = item.querySelector('.shipment-type');
                        
                        if (customerElem) customerElem.textContent = shipment.customer || '';
                        if (referenceElem) referenceElem.textContent = shipment.reference || '';
                        if (arrivalElem) arrivalElem.textContent = shipment.arrival || 'N/A';
                        if (departureElem) departureElem.textContent = shipment.departure || 'N/A';
                        if (containerNumberElem) containerNumberElem.textContent = containerNumber;
                        
                        // type 데이터 추가
                        if (typeElem) {
                            if (shipment.type && shipment.type !== 'N/A') {
                                typeElem.textContent = shipment.type;
                                typeElem.style.display = 'inline'; // 보이게 설정
                            } else {
                                typeElem.style.display = 'none'; // 안 보이게 설정
                            }
                        }
                        
                        itemsContainer.appendChild(item);
                    });
                } else {
                    itemsContainer.innerHTML = '<span style="color: #adb5bd; padding-left: 1rem;">No shipments</span>';
                }
            }
        });
    
        startHorizontalScrolling();
    }

    /**
     * Finds overflowing rows, duplicates content for a seamless loop, and applies animation.
     */
    function startHorizontalScrolling() {
        const containers = document.querySelectorAll('.shipment-items-container');
        containers.forEach(container => {
            if (container.scrollWidth > container.clientWidth) {
                const originalItems = Array.from(container.children);
                originalItems.forEach(item => {
                    container.appendChild(item.cloneNode(true));
                });

                const scrollDistance = -container.scrollWidth / 2;
                const scrollRate = 50; // pixels per second
                const duration = Math.abs(scrollDistance) / scrollRate;

                // Set animation properties directly in JS for a non-pausing, non-alternating loop
                container.style.setProperty('--scroll-width', `${scrollDistance}px`);
                container.style.animation = `horizontal-scroll ${duration}s linear infinite`;
            }
        });
    }

    // Initial call to start the process.
    loadAndDisplayData();
});
