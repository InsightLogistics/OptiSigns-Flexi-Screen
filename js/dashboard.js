let KCCIChart;
let SCFIChart;
let WCIChart;
let IACIChart;
let blankSailingChart;
let FBXChart;
let XSIChart;
let MBCIChart;
let exchangeRateChart;

const DATA_JSON_URL = 'data/crawling_data.json';

document.addEventListener('DOMContentLoaded', () => {
    const setupChart = (chartId, type, datasets, additionalOptions = {}, isAggregated = false) => {
        const ctx = document.getElementById(chartId);
        if (ctx) {
            if (Chart.getChart(chartId)) {
                Chart.getChart(chartId).destroy();
            }

            const defaultOptions = {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: false // X축 타이틀 제거
                        },
                        type: 'time',
                        time: {
                            unit: 'month', // 가로축 단위를 월별로 고정
                            displayFormats: {
                                month: 'MM/01/yy' // 월별 형식 변경
                            },
                            tooltipFormat: 'M/d/yyyy'
                        },
                        ticks: {
                            source: 'auto',
                            autoSkipPadding: 10,
                            maxTicksLimit: 12 // 지난 1년 기준 월별 12개 눈금 배치
                        },
                        grid: {
                            display: false // 가로축 보조선은 유지
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: false // Y축 타이틀 제거
                        },
                        ticks: {
                            count: 5 // 세로 기준 5개 유지
                        },
                        grid: {
                            display: true, // 세로축 보조선 표시
                            color: 'rgba(0, 0, 0, 0.1)' // 보조선 색상 설정
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'right',
                        labels: {
                            // boxWidth: 20, // 기본값으로 두거나 필요한 경우 조정
                            // boxHeight: 10, // 기본값으로 두거나 필요한 경우 조정
                            usePointStyle: false, // 여전히 false 유지

                            // 범례 아이템을 커스터마이징하는 함수
                            generateLabels: function(chart) {
                                const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                return originalLabels.map(label => {
                                    // 각 범례 아이템에 대해
                                    label.lineWidth = 0; // 범례 상자의 테두리 두께를 0으로 설정
                                    label.strokeStyle = 'transparent'; // 범례 상자의 테두리 색상을 투명으로 설정
                                    // 중요: 데이터셋의 borderColor는 그대로 유지하되,
                                    // 범례 아이콘을 그릴 때만 테두리를 없앱니다.

                                    return label;
                                });
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                elements: {
                    point: {
                        radius: 0
                    }
                }
            };

            const options = { ...defaultOptions, ...additionalOptions };
            if (options.scales && additionalOptions.scales) {
                options.scales = { ...defaultOptions.scales, ...additionalOptions.scales };
                if (options.scales.x && additionalOptions.scales.x) {
                    options.scales.x = { ...defaultOptions.scales.x, ...additionalOptions.scales.x };
                }
                if (options.scales.y && additionalOptions.scales.y) {
                    options.scales.y = { ...defaultOptions.scales.y, ...additionalOptions.scales.y };
                    if (!additionalOptions.scales.y.ticks || !additionalOptions.scales.y.ticks.hasOwnProperty('count')) {
                        options.scales.y.ticks.count = defaultOptions.scales.y.ticks.count;
                    }
                }
            }

            let chartData = { datasets: datasets };
            if (type === 'bar' && additionalOptions.labels) {
                chartData = { labels: additionalOptions.labels, datasets: datasets };
                delete additionalOptions.labels;
            }

            return new Chart(ctx, {
                type: type,
                data: chartData,
                options: options
            });
        }
        return null;
    };

    // 차트 각 지수 색깔 다양화 - 더 많은 색상 추가
    const colors = [
        'rgba(0, 101, 126, 0.8)',   // Dark Teal
        'rgba(0, 58, 82, 0.8)',    // Darker Blue
        'rgba(40, 167, 69, 0.8)',   // Green
        'rgba(253, 126, 20, 0.8)',  // Orange
        'rgba(111, 66, 193, 0.8)',  // Purple
        'rgba(220, 53, 69, 0.8)',   // Red
        'rgba(23, 162, 184, 0.8)',  // Cyan
        'rgba(108, 117, 125, 0.8)', // Gray
        'rgba(255, 193, 7, 0.8)',   // Yellow
        'rgba(52, 58, 64, 0.8)',    // Dark Gray
        'rgba(200, 100, 0, 0.8)',   // Brown
        'rgba(0, 200, 200, 0.8)',   // Light Blue
        'rgba(150, 50, 100, 0.8)',  // Plum
        'rgba(50, 150, 50, 0.8)',   // Forest Green
        'rgba(250, 100, 150, 0.8)', // Pink
        'rgba(100, 100, 200, 0.8)'  // Medium Blue
    ];

    const borderColors = [
        '#00657e',
        '#003A52',
        '#218838',
        '#e68a00',
        '#5a32b2',
        '#c82333',
        '#138496',
        '#6c757d',
        '#ffc107',
        '#343a40',
        '#c86400',
        '#00c8c8',
        '#963264',
        '#329632',
        '#fa6496',
        '#6464c8'
    ];

    let colorIndex = 0;
    const getNextColor = () => {
        const color = colors[colorIndex % colors.length];
        colorIndex++;
        return color;
    };
    const getNextBorderColor = () => {
        const color = borderColors[colorIndex % borderColors.length];
        return color;
    };

    const aggregateDataByMonth = (data, numMonths = 12) => {
        if (data.length === 0) return { aggregatedData: [], monthlyLabels: [] };

        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        const monthlyDataMap = new Map();

        const latestDate = new Date(data[data.length - 1].date);
        const startDate = new Date(latestDate);
        startDate.setMonth(latestDate.getMonth() - (numMonths - 1));

        const allMonthKeys = [];
        let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (currentMonth <= latestDate) {
            allMonthKeys.push(`${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`);
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        data.forEach(item => {
            const date = new Date(item.date);
            const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!monthlyDataMap.has(yearMonth)) {
                monthlyDataMap.set(yearMonth, {});
            }
            const monthEntry = monthlyDataMap.get(yearMonth);

            for (const key in item) {
                if (key !== 'date' && item[key] !== null && !isNaN(item[key])) {
                    if (!monthEntry[key]) {
                        monthEntry[key] = { sum: 0, count: 0 };
                    }
                    monthEntry[key].sum += item[key];
                    monthEntry[key].count++;
                }
            }
        });

        const aggregatedData = [];
        const monthlyLabels = [];

        const allDataKeys = new Set();
        if (data.length > 0) {
            Object.keys(data[0]).forEach(key => {
                if (key !== 'date') allDataKeys.add(key);
            });
        }

        allMonthKeys.forEach(yearMonth => {
            const monthEntry = monthlyDataMap.get(yearMonth);
            const newEntry = { date: yearMonth + '-01' };

            allDataKeys.forEach(key => {
                newEntry[key] = monthEntry && monthEntry[key] && monthEntry[key].count > 0
                                        ? monthEntry[key].sum / monthEntry[key].count
                                        : null;
            });
            
            aggregatedData.push(newEntry);
            monthlyLabels.push(yearMonth + '-01');
        });

        return { aggregatedData: aggregatedData, monthlyLabels: monthlyLabels };
    };

    const setupSlider = (slidesSelector, intervalTime) => {
        const slides = document.querySelectorAll(slidesSelector);
        let currentSlide = 0;

        const showSlide = (index) => {
            slides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                } else {
                    slide.classList.remove('active');
                }
            });
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        };

        if (slides.length > 0) {
            showSlide(currentSlide);
            if (slides.length > 1) {
                // 기존 인터벌이 있다면 클리어 (슬라이더 중복 실행 방지)
                if (slides[0].dataset.intervalId) {
                    clearInterval(parseInt(slides[0].dataset.intervalId));
                }
                const intervalId = setInterval(nextSlide, intervalTime);
                slides[0].dataset.intervalId = intervalId.toString(); // 첫 번째 슬라이드에 인터벌 ID 저장
            }
        }
    };

    const cityTimezones = {
        'la': 'America/Los_Angeles',
        'ny': 'America/New_York',
        'paris': 'Europe/Paris',
        'shanghai': 'Asia/Shanghai',
        'seoul': 'Asia/Seoul',
        'sydney': 'Australia/Sydney'
    };

    function updateWorldClocks() {
        const now = new Date();
        for (const cityKey in cityTimezones) {
            const timezone = cityTimezones[cityKey];
            const options = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: timezone
            };
            const timeString = new Intl.DateTimeFormat('en-US', options).format(now);
            const elementId = `time-${cityKey}`;
            const timeElement = document.getElementById(elementId);
            if (timeElement) {
                timeElement.textContent = timeString;
            }
        }
    }

    // 날짜 포맷팅 헬퍼 함수
    const formatDateForTable = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date)) return ''; // Invalid date
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}-${day}-${year}`;
    };

    // renderTable 함수 수정: headerDates 인자 추가
    const renderTable = (containerId, headers, rows, headerDates = {}) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Table container with ID ${containerId} not found.`);
            return;
        }

        container.innerHTML = '';

        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
            container.innerHTML = '<p class="text-gray-600 text-center">No data available for this table.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('data-table');

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            // 헤더에 날짜 정보 추가
            if (headerText.includes('Current Index') && headerDates.currentIndexDate) {
                th.innerHTML = `Current Index<br><span class="table-date-header">${headerDates.currentIndexDate}</span>`;
            } else if (headerText.includes('Previous Index') && headerDates.previousIndexDate) {
                th.innerHTML = `Previous Index<br><span class="table-date-header">${headerDates.previousIndexDate}</span>`;
            } else {
                th.textContent = headerText;
            }
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        rows.forEach(rowData => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                let content = '';
                let colorClass = '';

                if (header.includes('Weekly Change')) {
                    const weeklyChange = rowData.weekly_change;
                    
                    if (weeklyChange?.value !== undefined && weeklyChange?.percentage !== undefined) {
                        // weeklyChange.value를 가져와 정수로 반올림합니다.
                        const valueAsRoundedInteger = Math.round(weeklyChange.value);
                        
                        // 반올림된 정수 값을 사용합니다.
                        // 퍼센트 값인 weeklyChange.percentage는 그대로 둡니다.
                        content = `${valueAsRoundedInteger} (${weeklyChange.percentage})`;
                        colorClass = weeklyChange.color_class || '';
                    } else {
                        content = '-';
                        colorClass = '';
                    }
                    
                    td.textContent = content;
                    if (colorClass) {
                        td.classList.add(colorClass);
                    }
                } else if (header.includes('Current Index')) {
                    content = rowData.current_index ?? '-';
                    td.textContent = content; // 값만 표시, 날짜는 헤더로
                } else if (header.includes('Previous Index')) {
                    content = rowData.previous_index ?? '-';
                    td.textContent = content; // 값만 표시, 날짜는 헤더로
                } else if (header.includes('Route') || header.includes('route')) {
                    const displayRouteName = rowData.route ? rowData.route.split('_').slice(1).join('_') : '-';
                    td.textContent = displayRouteName;
                } else {
                    td.textContent = rowData[header.toLowerCase().replace(/\s/g, '_')] ?? '-';
                }
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    };

    const routeToDataKeyMap = {
        KCCI: {
            "종합지수": "KCCI_Composite_Index",
            "미주서안": "KCCI_US_West_Coast",
            "미주동안": "KCCI_US_East_Coast",
            "유럽": "KCCI_Europe",
            "지중해": "KCCI_Mediterranean",
            "중동": "KCCI_Middle_East",
            "호주": "KCCI_Australia",
            "남미동안": "KCCI_South_America_East_Coast",
            "남미서안": "KCCI_South_America_West_Coast",
            "남아프리카": "KCCI_South_Africa",
            "서아프리카": "KCCI_West_Africa",
            "중국": "KCCI_China",
            "일본": "KCCI_Japan",
            "동남아시아": "KCCI_Southeast_Asia"
        },
        SCFI: {
            "종합지수": "SCFI_Composite_Index",
            "미주서안": "SCFI_US_West_Coast",
            "미주동안": "SCFI_US_East_Coast",
            "북유럽": "SCFI_North_Europe",
            "지중해": "SCFI_Mediterranean",
            "동남아시아": "SCFI_Southeast_Asia",
            "중동": "SCFI_Middle_East",
            "호주/뉴질랜드": "SCFI_Australia_New_Zealand",
            "남아메리카": "SCFI_South_America",
            "일본서안": "SCFI_Japan_West_Coast",
            "일본동안": "SCFI_Japan_East_Coast",
            "한국": "SCFI_Korea",
            "동부/서부 아프리카": "SCFI_East_West_Africa",
            "남아공": "SCFI_South_Africa"
        },
        WCI: {
            "종합지수": "WCI_Composite_Index",
            "상하이 → 로테르담": "WCI_Shanghai_Rotterdam",
            "로테르담 → 상하이": "WCI_Rotterdam_Shanghai",
            "상하이 → 제노바": "WCI_Shanghai_Genoa",
            "상하이 → 로스엔젤레스": "WCI_Shanghai_to_Los_Angeles",
            "로스엔젤레스 → 상하이": "WCI_Los_Angeles_to_Shanghai",
            "상하이 → 뉴욕": "WCI_Shanghai_New_York",
            "뉴욕 → 로테르담": "WCI_New_York_Rotterdam",
            "로테르담 → 뉴욕": "WCI_Rotterdam_New_York",
        },
        IACI: {
            "종합지수": "IACI_Composite_Index"
        },
        BLANKSAILING: {
            "Gemini Cooperation": "BLANKSAILING_Gemini_Cooperation",
            "MSC": "BLANKSAILING_MSC",
            "OCEAN Alliance": "BLANKSAILING_OCEAN_Alliance",
            "Premier Alliance": "BLANKSAILING_Premier_Alliance",
            "Others/Independent": "BLANKSAILING_Others_Independent",
            "Total": "BLANKSAILING_Total"
        },
        FBX: {
            "종합지수": "FBX_Composite_Index",
            "중국/동아시아 → 미주서안": "FBX_China_EA_US_West_Coast",
            "미주서안 → 중국/동아시아": "FBX_US_West_Coast_China_EA",
            "중국/동아시아 → 미주동안": "FBX_China_EA_US_East_Coast",
            "미주동안 → 중국/동아시아": "FBX_US_East_Coast_China_EA",
            "중국/동아시아 → 북유럽": "FBX_China_EA_North_Europe",
            "북유럽 → 중국/동아시아": "FBX_North_Europe_China_EA",
            "중국/동아시아 → 지중해": "FBX_China_EA_Mediterranean",
            "지중해 → 중국/동아시아": "FBX_Mediterranean_China_EA",
            "미주동안 → 북유럽": "FBX_US_East_Coast_North_Europe",
            "북유럽 → 미주동안": "FBX_North_Europe_US_East_Coast",
            "유럽 → 남미동안": "FBX_Europe_South_America_East_Coast",
            "유럽 → 남미서안": "FBX_Europe_South_America_West_Coast"
        },
        XSI: {
            "동아시아 → 북유럽": "XSI_East_Asia_North_Europe",
            "북유럽 → 동아시아": "XSI_North_Europe_East_Asia",
            "동아시아 → 미주서안": "XSI_East_Asia_US_West_Coast",
            "미주서안 → 동아시아": "XSI_US_West_Coast_East_Asia",
            "동아시아 → 남미동안": "XSI_East_Asia_South_America_East_Coast",
            "북유럽 → 미주동안": "XSI_North_Europe_US_East_Coast",
            "미주동안 → 북유럽": "XSI_US_East_Coast_North_Europe",
            "북유럽 → 남미동안": "XSI_North_Europe_South_America_East_Coast"
        },
        MBCI: {
            "종합지수": "MBCI_Value"
        }
    };

const createDatasetsFromTableRows = (indexType, chartData, tableRows) => {
        const datasets = [];
        const mapping = routeToDataKeyMap[indexType];
        if (!mapping) {
            console.warn(`No data key mapping found for index type: ${indexType}`);
            return datasets;
        }
    
        // 각 차트 유형마다 색상 인덱스를 초기화하여 색상 할당이 일관되도록 합니다.
        colorIndex = 0; 
    
        tableRows.forEach(row => {
            const originalRouteName = row.route.split('_').slice(1).join('_');
            const dataKey = mapping[originalRouteName];
            
            if (dataKey !== null && dataKey !== undefined && row.current_index !== "") { 
                const mappedData = chartData.map(item => {
                    const xVal = item.date;
                    const yVal = item[dataKey];
                    return { x: xVal, y: yVal };
                });
    
                const filteredMappedData = mappedData.filter(point => point.y !== null && point.y !== undefined);
    
                if (filteredMappedData.length > 0) {
                    const sharedColor = borderColors[colorIndex % borderColors.length]; 
                    colorIndex++; 
    
                    // 여기부터 수정된 부분입니다.
                    let datasetConfig = {
                        label: originalRouteName,
                        data: filteredMappedData,
                        backgroundColor: sharedColor,
                        borderColor: sharedColor,     
                        borderWidth: (originalRouteName.includes('종합지수') || originalRouteName.includes('글로벌 컨테이너 운임 지수') || originalRouteName.includes('US$/40ft') || originalRouteName.includes('Index(종합지수)')) ? 2 : 1,
                        fill: false
                    };
    
                    datasets.push(datasetConfig);
                } else {
                    console.warn(`WARNING: No valid data points found for ${indexType} - route: '${originalRouteName}' (dataKey: '${dataKey}'). Skipping dataset.`);
                }
            } else if (dataKey === null) {
                console.info(`INFO: Skipping chart dataset for route '${row.route}' in ${indexType} as it's explicitly mapped to null (no chart data expected).`);
            } else {
                console.warn(`WARNING: No dataKey found or current_index is empty for ${indexType} - route: '${row.route}'. Skipping dataset.`);
            }
        });
        return datasets;
    };

    // 날씨 아이콘 매핑
    const weatherIconMapping = {
        'clear': '01d', '맑음': '01d',
        'clouds': '02d', '구름': '02d',
        'partly cloudy': '02d',
        'scattered clouds': '03d',
        'broken clouds': '04d',
        'shower rain': '09d',
        'rain': '10d', '비': '10d',
        'thunderstorm': '11d',
        'snow': '13d', '눈': '13d',
        'mist': '50d',
        'fog': '50d',
        'haze': '50d',
        'drizzle': '09d'
    };

    const weatherIconUrl = (status) => {
        if (!status) return `https://placehold.co/80x80/cccccc/ffffff?text=Icon`;
        const lowerStatus = status.toLowerCase();
        let iconCode = null;

        for (const key in weatherIconMapping) {
            if (lowerStatus.includes(key)) {
                iconCode = weatherIconMapping[key];
                break;
            }
        }
        
        if (iconCode) {
            return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        }
        return `https://placehold.co/80x80/cccccc/ffffff?text=Icon`; // Default placeholder if no match
    };

    async function loadAndDisplayData() {
        let allDashboardData = {};
        try {
            const response = await fetch(DATA_JSON_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            allDashboardData = await response.json();
            console.log("Loaded all dashboard data:", allDashboardData);

            const chartDataBySection = allDashboardData.chart_data || {};
            const weatherData = allDashboardData.weather_data || {};
            const exchangeRatesData = allDashboardData.exchange_rate || [];
            const tableDataBySection = allDashboardData.table_data || {};

            const currentWeatherData = weatherData.current || {};
            const forecastWeatherData = weatherData.forecast || [];

            // 날씨 정보 업데이트 (요소 존재 여부 확인)
            const tempCurrent = document.getElementById('temperature-current');
            if (tempCurrent) tempCurrent.textContent = currentWeatherData.LA_Temperature ? `${currentWeatherData.LA_Temperature}°F` : '--°F';
            
            const statusCurrent = document.getElementById('status-current');
            if (statusCurrent) statusCurrent.textContent = currentWeatherData.LA_WeatherStatus || 'Loading...';
            
            const weatherIcon = document.getElementById('weather-icon-current');
            if (weatherIcon) weatherIcon.src = weatherIconUrl(currentWeatherData.LA_WeatherStatus);

            const humidityCurrent = document.getElementById('humidity-current');
            if (humidityCurrent) humidityCurrent.textContent = currentWeatherData.LA_Humidity ? `${currentWeatherData.LA_Humidity}%` : '--%';
            
            const windSpeedCurrent = document.getElementById('wind-speed-current');
            if (windSpeedCurrent) windSpeedCurrent.textContent = currentWeatherData.LA_WindSpeed ? `${currentWeatherData.LA_WindSpeed} mph` : '-- mph';
            
            const pressureCurrent = document.getElementById('pressure-current');
            if (pressureCurrent) pressureCurrent.textContent = currentWeatherData.LA_Pressure ? `${currentWeatherData.LA_Pressure} hPa` : '-- hPa';
            
            const visibilityCurrent = document.getElementById('visibility-current');
            if (visibilityCurrent) visibilityCurrent.textContent = currentWeatherData.LA_Visibility ? `${currentWeatherData.LA_Visibility} mile` : '-- mile';
            
            const sunriseTime = document.getElementById('sunrise-time');
            if (sunriseTime) sunriseTime.textContent = currentWeatherData.LA_Sunrise || '--';
            
            const sunsetTime = document.getElementById('sunset-time');
            if (sunsetTime) sunsetTime.textContent = currentWeatherData.LA_Sunset || '--';

            const forecastTableContainer = document.getElementById('forecast-table-container');
            if (forecastTableContainer) {
                forecastTableContainer.innerHTML = ''; 

                if (forecastWeatherData.length > 0) {
                    const table = document.createElement('table');
                    table.classList.add('data-table', 'forecast-table'); 

                    // --- colgroup 추가 (이 부분은 유지합니다) ---
                    const colgroup = document.createElement('colgroup');
                    
                    const col1 = document.createElement('col');
                    col1.style.width = '20%'; 
                    colgroup.appendChild(col1);

                    for (let i = 0; i < 5; i++) { 
                        const col = document.createElement('col');
                        col.style.width = '16%';
                        colgroup.appendChild(col);
                    }
                    table.appendChild(colgroup); 
                    // --- colgroup 추가 끝 ---
                    
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');

                    headerRow.insertCell().textContent = ''; // 첫 번째 빈 셀

                    // 날짜 헤더 (데이터가 부족해도 5개를 모두 생성하도록 수정)
                    // slice(0, 5)는 최대 5개이므로, 만약 데이터가 3개면 3개만 나옵니다.
                    // 이를 보완하여 항상 5개의 열을 만들도록 합니다.
                    const displayForecast = forecastWeatherData.slice(1, 6);
                    const numForecastDays = 5; // 항상 5일 예보를 표시
                    
                    for (let i = 0; i < numForecastDays; i++) {
                        const day = displayForecast[i]; // 데이터가 없으면 undefined
                        const th = document.createElement('th');
                        th.className = 'text-sm font-semibold whitespace-nowrap leading-tight h-8'; 
                        
                        if (day && day.date) { // day 객체가 존재하고 date 속성이 있을 때만 처리
                            const dateParts = day.date.split('/');
                            if (dateParts.length === 3) {
                                const month = parseInt(dateParts[0], 10);
                                const dayNum = parseInt(dateParts[1], 10);
                                if (!isNaN(month) && !isNaN(dayNum)) {
                                    th.textContent = `${month}/${dayNum}`;
                                } else {
                                    th.textContent = '--';
                                }
                            } else {
                                th.textContent = '--';
                            }
                        } else {
                            th.textContent = '--'; // 데이터가 없으면 -- 표시
                        }
                        headerRow.appendChild(th);
                    }
                    thead.appendChild(headerRow);
                    table.appendChild(thead);
                    
                    const tbody = document.createElement('tbody');
                    
                    // Max(°F) 행 (데이터가 부족해도 5개를 모두 생성하도록 수정)
                    const maxRow = document.createElement('tr');
                    maxRow.insertCell().textContent = 'Max (°F)';
                    for (let i = 0; i < numForecastDays; i++) {
                        const day = displayForecast[i];
                        const td = document.createElement('td');
                        td.style.whiteSpace = 'pre-line'; 
                        
                        if (day && day.max_temp != null) {
                            td.textContent = `${day.max_temp}`;
                        } else {
                            td.textContent = '--';
                        }
                        maxRow.appendChild(td);
                    }
                    tbody.appendChild(maxRow);
                    
                    // Min(°F) 행 (데이터가 부족해도 5개를 모두 생성하도록 수정)
                    const minRow = document.createElement('tr');
                    minRow.insertCell().textContent = 'Min (°F)';
                    for (let i = 0; i < numForecastDays; i++) {
                        const day = displayForecast[i];
                        const td = document.createElement('td');
                        td.style.whiteSpace = 'pre-line';
                        
                        if (day && day.min_temp != null) {
                            td.textContent = `${day.min_temp}`;
                        } else {
                            td.textContent = '--';
                        }
                        minRow.appendChild(td);
                    }
                    tbody.appendChild(minRow);
                    
                    // Weather 상태 행 (데이터가 부족해도 5개를 모두 생성하도록 수정)
                    const weatherStatusRow = document.createElement('tr');
                    weatherStatusRow.insertCell().textContent = 'Weather';
                    for (let i = 0; i < numForecastDays; i++) {
                        const day = displayForecast[i];
                        const td = document.createElement('td');
                        // !!! 중요: 길어지는 텍스트 처리 - CSS가 우선이지만, JS에서 직접 적용도 가능합니다.
                        // CSS에서 확실히 적용하는 것이 더 좋습니다. 아래 CSS 수정을 참조하세요.
                        if (day && day.status) {
                            td.textContent = day.status.replace(/\s*\(.*\)/, '').trim();
                        } else {
                            td.textContent = '--';
                        }
                        weatherStatusRow.appendChild(td);
                    }
                    tbody.appendChild(weatherStatusRow);
                    
                    table.appendChild(tbody);
                    forecastTableContainer.appendChild(table);
                    
                } else {
                    forecastTableContainer.innerHTML = '<p class="text-gray-600 text-center">No forecast data available.</p>';
                }
            } else {
                console.warn("Element with ID 'forecast-table-container' not found. Cannot render forecast table.");
            }

            const currentExchangeRate = exchangeRatesData.length > 0 ? exchangeRatesData[exchangeRatesData.length - 1].rate : null;
            const currentExchangeRateElement = document.getElementById('current-exchange-rate-value');
            if (currentExchangeRateElement) {
                currentExchangeRateElement.textContent = currentExchangeRate ? `${currentExchangeRate.toFixed(2)} KRW` : 'Loading...';
            } else {
                console.warn("Element with ID 'current-exchange-rate-value' not found.");
            }


            if (exchangeRateChart) exchangeRateChart.destroy();
            
            const exchangeRateDatasets = [{
                label: 'USD/KRW Exchange Rate',
                data: exchangeRatesData.map(item => ({ x: item.date, y: item.rate })),
                backgroundColor: 'rgba(253, 126, 20, 0.5)',
                borderColor: '#e68a00',
                borderWidth: 2,
                fill: false,
                pointRadius: 0
            }];
            console.log("Exchange Rate Chart Datasets (before setup):", exchangeRateDatasets);
            console.log("Exchange Rate Chart Data Sample (first 5 points):", exchangeRateDatasets[0].data.slice(0, 5));


            exchangeRateChart = setupChart(
                'exchangeRateChartCanvas', 'line',
                exchangeRateDatasets,
                {
                    scales: {
                        x: {
                            type: 'time',
                            time: {  
                                unit: 'day',  // 환율 차트는 원래대로 'day' 단위 유지
                                displayFormats: { day: 'MM/dd' }, // 환율 차트는 원래대로 'MM/dd' 형식 유지
                                tooltipFormat: 'M/d/yyyy'
                            },
                            ticks: { autoSkipPadding: 10, maxTicksLimit: undefined }, // 환율 차트의 maxTicksLimit 제거
                            title: { display: false } // X축 타이틀 제거
                        },
                        y: {
                            beginAtZero: false,
                            ticks: { count: 5 },
                            grid: { display: true, color: 'rgba(0, 0, 0, 0.1)' }, // 세로 보조선 추가
                            title: { display: false } // Y축 타이틀 제거
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                },
                false // 환율 차트는 월별 집계를 하지 않으므로 false 유지
            );

            // 각 지수별 최신/이전 날짜를 가져오는 헬퍼 함수
            const getLatestAndPreviousDates = (chartData) => {
                if (!chartData || chartData.length < 2) return { latestDate: null, previousDate: null };
                const sortedData = [...chartData].sort((a, b) => new Date(b.date) - new Date(a.date));
                const latestDate = sortedData[0] ? new Date(sortedData[0].date) : null;
                const previousDate = sortedData[1] ? new Date(sortedData[1].date) : null;
                return { latestDate, previousDate };
            };


            // KCCI 차트 및 테이블
            const KCCIData = chartDataBySection.KCCI || [];
            const { latestDate: KCCILatestDate, previousDate: KCCIPrevDate } = getLatestAndPreviousDates(KCCIData);
            const KCCITableRows = tableDataBySection.KCCI ? tableDataBySection.KCCI.rows : [];
            const KCCIDatasets = createDatasetsFromTableRows('KCCI', KCCIData, KCCITableRows);
            KCCIChart = setupChart('KCCIChart', 'line', KCCIDatasets, {}, false);
            renderTable('KCCITableContainer', tableDataBySection.KCCI.headers, KCCITableRows, {
                currentIndexDate: formatDateForTable(KCCILatestDate),
                previousIndexDate: formatDateForTable(KCCIPrevDate)
            });


            // SCFI 차트 및 테이블
            const SCFIData = chartDataBySection.SCFI || [];
            const { latestDate: SCFILatestDate, previousDate: SCFIPrevDate } = getLatestAndPreviousDates(SCFIData);
            const SCFITableRows = tableDataBySection.SCFI ? tableDataBySection.SCFI.rows : [];
            const SCFIDatasets = createDatasetsFromTableRows('SCFI', SCFIData, SCFITableRows);
            SCFIChart = setupChart('SCFIChart', 'line', SCFIDatasets, {}, false);
            renderTable('SCFITableContainer', tableDataBySection.SCFI.headers, SCFITableRows, {
                currentIndexDate: formatDateForTable(SCFILatestDate),
                previousIndexDate: formatDateForTable(SCFIPrevDate)
            });


            // WCI 차트 및 테이블
            const WCIData = chartDataBySection.WCI || [];
            const { latestDate: WCILatestDate, previousDate: WCIPrevDate } = getLatestAndPreviousDates(WCIData);
            const WCITableRows = tableDataBySection.WCI ? tableDataBySection.WCI.rows : [];
            const WCIDatasets = createDatasetsFromTableRows('WCI', WCIData, WCITableRows);
            WCIChart = setupChart('WCIChart', 'line', WCIDatasets, {}, false);
            renderTable('WCITableContainer', tableDataBySection.WCI.headers, WCITableRows, {
                currentIndexDate: formatDateForTable(WCILatestDate),
                previousIndexDate: formatDateForTable(WCIPrevDate)
            });


            // IACI 차트 및 테이블
            const IACIData = chartDataBySection.IACI || [];
            const { latestDate: IACILatestDate, previousDate: IACIPrevDate } = getLatestAndPreviousDates(IACIData);
            const IACITableRows = tableDataBySection.IACI ? tableDataBySection.IACI.rows : [];
            const IACIDatasets = createDatasetsFromTableRows('IACI', IACIData, IACITableRows);
            IACIChart = setupChart('IACIChart', 'line', IACIDatasets, {}, false);
            renderTable('IACITableContainer', tableDataBySection.IACI.headers, IACITableRows, {
                currentIndexDate: formatDateForTable(IACILatestDate),
                previousIndexDate: formatDateForTable(IACIPrevDate)
            });


            const blankSailingRawData = chartDataBySection.BLANKSAILING || [];
            const { aggregatedData: aggregatedBlankSailingData, monthlyLabels: blankSailingChartDates } = aggregateDataByMonth(blankSailingRawData, 12);
            
            // Blank Sailing 테이블의 날짜는 원본 데이터의 마지막 날짜를 사용합니다.
            const { latestDate: BSLatestDate, previousDate: BSPrevDate } = getLatestAndPreviousDates(blankSailingRawData);
            const blankSailingTableRows = tableDataBySection.BLANKSAILING ? tableDataBySection.BLANKSAILING.rows : [];
            
            const blankSailingDatasets = [
                {
                    label: "Gemini Cooperation",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_Gemini_Cooperation })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 0
                },
                {
                    label: "MSC",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_MSC })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 0
                },
                {
                    label: "OCEAN Alliance",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_OCEAN_Alliance })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)', // <--- 이 부분 추가
                    borderWidth: 0 // <--- 이 부분 수정
                },
                {
                    label: "Premier Alliance",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_Premier_Alliance })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 0
                },
                {
                    label: "Others/Independent",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_Others_Independent })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 0
                },
                {
                    label: "Total",
                    data: aggregatedBlankSailingData.map(item => ({ x: item.date, y: item.BLANKSAILING_Total })),
                    backgroundColor: getNextColor(),
                    borderColor: 'rgba(0, 0, 0, 0)',
                    borderWidth: 0
                }
            ].filter(dataset => dataset.data.some(point => point.y !== null && point.y !== undefined));

            blankSailingChart = setupChart(
                'blankSailingChart', 'bar',
                blankSailingDatasets,
                {
                    scales: {
                        x: {
                            stacked: true,
                            type: 'time',
                            time: {
                                unit: 'month',
                                displayFormats: { month: 'MM/01/yy' }, // 형식 변경
                                tooltipFormat: 'M/d/yyyy'
                            },
                            title: { display: false } // X축 타이틀 제거
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: { display: false } // Y축 타이틀 제거
                        }
                    }
                },
                true
            );
            renderTable('BLANKSAILINGTableContainer', tableDataBySection.BLANKSAILING.headers, blankSailingTableRows, {
                currentIndexDate: formatDateForTable(BSLatestDate),
                previousIndexDate: formatDateForTable(BSPrevDate)
            });


            // FBX 차트 및 테이블
            const FBXData = chartDataBySection.FBX || [];
            const { latestDate: FBXLatestDate, previousDate: FBXPrevDate } = getLatestAndPreviousDates(FBXData);
            const FBXTableRows = tableDataBySection.FBX ? tableDataBySection.FBX.rows : [];
            const FBXDatasets = createDatasetsFromTableRows('FBX', FBXData, FBXTableRows);
            FBXChart = setupChart('FBXChart', 'line', FBXDatasets, {}, false);
            renderTable('FBXTableContainer', tableDataBySection.FBX.headers, FBXTableRows, {
                currentIndexDate: formatDateForTable(FBXLatestDate),
                previousIndexDate: formatDateForTable(FBXPrevDate)
            });


            // XSI 차트 및 테이블
            const XSIData = chartDataBySection.XSI || [];
            const { latestDate: XSILatestDate, previousDate: XSIPrevDate } = getLatestAndPreviousDates(XSIData);
            const XSITableRows = tableDataBySection.XSI ? tableDataBySection.XSI.rows : [];
            const XSIDatasets = createDatasetsFromTableRows('XSI', XSIData, XSITableRows);
            XSIChart = setupChart('XSIChart', 'line', XSIDatasets, {}, false);
            renderTable('XSITableContainer', tableDataBySection.XSI.headers, XSITableRows, {
                currentIndexDate: formatDateForTable(XSILatestDate),
                previousIndexDate: formatDateForTable(XSIPrevDate)
            });

            // MBCI 차트 및 테이블
            const MBCIData = chartDataBySection.MBCI || [];
            const { latestDate: MBCILatestDate, previousDate: MBCIPrevDate } = getLatestAndPreviousDates(MBCIData);
            const MBCITableRows = tableDataBySection.MBCI ? tableDataBySection.MBCI.rows : [];
            const MBCIDatasets = createDatasetsFromTableRows('MBCI', MBCIData, MBCITableRows);
            MBCIChart = setupChart('MBCIChart', 'line', MBCIDatasets, {}, false);
            renderTable('MBCITableContainer', tableDataBySection.MBCI.headers, MBCITableRows, {
                currentIndexDate: formatDateForTable(MBCILatestDate),
                previousIndexDate: formatDateForTable(MBCIPrevDate)
            });

            // 슬라이더 시간 간격 설정 (10초 간격)
            setupSlider('.chart-slider-container > .chart-slide', 10000); // <-- .chart-slides를 .chart-slider-container로 변경
            setupSlider('.top-info-slider-container > .top-info-slide', 10000);


            // 세계 시간 업데이트 시작
            updateWorldClocks();
            setInterval(updateWorldClocks, 1000); // 1초마다 업데이트
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            const chartSliderContainer = document.querySelector('.chart-slider-container');
            if (chartSliderContainer) {
                chartSliderContainer.innerHTML = '<p class="placeholder-text text-red-500">Error loading data. Please try again later.</p>';
            }
        }
    }

    loadAndDisplayData();
});
