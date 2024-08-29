window.onload = function() {
    let isCalibrated = false;
    let modalIndex = 0;
    let eyeTrackingTimeout;
    let surveyShown = false; // Flag to ensure the survey is shown only once
    let resultsSaved = false; // Flag to prevent saving results multiple times
    const modals = document.querySelectorAll('.modal');

    let eyeTrackingData = []; // Array to store eye tracking data
    let fixationData = []; // Array to store fixation data
    let previousGaze = null;
    let saccadeAmplitude = 0;
    let surveyAnswer = ""; // Variable to store the survey answer
    let mapInitialized = false;
    // Function to display the appropriate modal
    const showModal = (index) => {
        modals.forEach(modal => modal.style.display = 'none'); // Hide all modals
        if (index < modals.length) {
            const modal = modals[index];
            const img = modal.querySelector('img.custom-image');
            if (img) {
                switch (index) {
                    case 0:
                        img.src = "images/hello.png"; // Ensure the path is correct
                        img.alt = "Hello Image"; // Optionally set the alt attribute
                        break;
                    case 1:
                        img.src = 'images/facial_recognition.png'; // Ensure the path is correct
                        img.alt = "Facial Recognition Image"; // Optionally set the alt attribute
                        break;
                    case 2:
                        img.src = 'images/webcam.png'; // Ensure the path is correct
                        img.alt = "Webcam Image"; // Optionally set the alt attribute
                        break;
                    case 3:
                        img.src = 'images/map_q1_ist6_mod_1.png'; // Ensure the path is correct
                        img.alt = "Question 1 Image"; // Optionally set the alt attribute
                        break;
                }
                img.onload = function() {
                    modal.style.display = 'block';
                };
            } else {
                modal.style.display = 'block';
            }
        }
    };

    // Function to close all modals
    const closeModal = () => {
        if (surveyShown) return; // Prevent closing modals if the survey has already been shown
        modals.forEach(modal => modal.style.display = 'none');
    };

    // Initial display of the first modal
    showModal(modalIndex);

    // Handle button clicks to move to the next modal
    document.querySelectorAll('.modal-button').forEach(button => {
        button.addEventListener('click', () => {
            modalIndex++;
            showModal(modalIndex);
        });
    });

    // Request camera access
    function requestCameraAccess() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then((stream) => {
                const videoElement = document.getElementById('camera-feed');
                videoElement.srcObject = stream;
                videoElement.play();
                document.getElementById('camera-allow-btn').disabled = true;
            })
            .catch((error) => {
                console.error('Camera access denied', error);
                alert('Camera access is required for this study.');
            });
    }

    // Retry camera access if denied initially
    window.retryCamera = function() {
        closeModal();
        showModal(2); // Show the camera modal again
    };

    // Start the calibration process
    window.startCalibration = function() {
        closeModal();
        document.getElementById('calibration-container').style.display = 'block';
        document.getElementById('calibration-title').style.display = 'block';
        document.getElementById('calibration-instructions').style.display = 'block';
        initWebGazer(); // Initialize WebGazer
    };

    // Initialize WebGazer and start eye tracking
    function initWebGazer() {
		console.log('Initializing WebGazer...');
        // Ensure WebGazer is properly configured
        webgazer.params.showVideo = false // or true, depending on your needs
        webgazer.params.showFaceOverlay =false; // Hide the face feedback box

        webgazer.setGazeListener(function(data, elapsedTime) {
            if (data) {
                const xprediction = data.x;
                const yprediction = data.y;
                const timestamp = Date.now();
                console.log('Gaze data:', xprediction, yprediction);

                // Calculate the saccade amplitude if there's previous gaze data
                if (previousGaze) {
                    const distance = Math.sqrt(Math.pow(xprediction - previousGaze.x, 2) + Math.pow(yprediction - previousGaze.y, 2));
                    saccadeAmplitude = distance / window.innerWidth * 100; // Percentage relative to screen width

                    if (distance < 20) { // Threshold for fixation detection
                        if (fixationData.length > 0) {
                            const lastFixation = fixationData[fixationData.length - 1];
                            lastFixation.fixation_ends_at_ms = timestamp;
                            lastFixation.fixation_duration_ms = timestamp - lastFixation.fixation_starts_at_ms;
                        } else {
                            fixationData.push({
                                fixation_point_x: xprediction,
                                fixation_point_y: yprediction,
                                fixation_starts_at_ms: timestamp,
                                fixation_ends_at_ms: null,
                                fixation_duration_ms: null
                            });
                        }
                    }
                }

                // Store eye tracking and saccade data
                eyeTrackingData.push({
                    gaze_x_percent: (xprediction / window.innerWidth) * 100,
                    gaze_y_percent: (yprediction / window.innerHeight) * 100,
                    gaze_timestamp_ms: timestamp,
                    saccade_amplitude_percent: saccadeAmplitude
                });

                previousGaze = { x: xprediction, y: yprediction };
            }
        }).begin();

        // Handle calibration clicks
        document.querySelectorAll('.calibration-point').forEach(button => {
            button.addEventListener('click', function() {
                webgazer.recordScreenPosition(button.getBoundingClientRect().left, button.getBoundingClientRect().top);
                button.style.backgroundColor = 'green';
                button.style.pointerEvents = 'none';
                checkCalibration();
            });
        });
    }

    // Check if calibration is complete
    function checkCalibration() {
        const calibratedButtons = document.querySelectorAll('.calibration-point[style*="background-color: green"]');
        if (calibratedButtons.length === 9) {
            isCalibrated = true;
            endCalibration();
        }
    }

    // End calibration and start eye tracking
    function endCalibration() {
		console.log('Stopping Calibration...');
        document.getElementById('calibration-container').style.display = 'none';
        document.getElementById('calibration-title').style.display = 'none';
        document.getElementById('calibration-instructions').style.display = 'none';
        document.getElementById('map').style.display = 'block';
        
		     // Hide WebGazer dot
             if (webgazer) {
                 webgazer.showPredictionPoints(false); // Hide WebGazer points
            }

		// Check if the class is applied
        console.log('Current body classes:', document.body.className);
		
		 // Display a message to the user and when Calibration is closed
        const messageModal = document.createElement('div');
        messageModal.className = 'modal';
        messageModal.style.display = 'block';

        const messageContent = document.createElement('div');
        messageContent.className = 'modal-content';
        messageContent.innerHTML = `
            <p>Please look at the road network and hydrography on the map during eye tracking.</p>
            <button class="modal-button" id=".modal-button">OK</button>
        `;
        messageModal.appendChild(messageContent);
        document.body.appendChild(messageModal);
		// Add event listener to the button to close the message and resume WebGazer
        document.getElementById('.modal-button').addEventListener('click', function() {
            messageModal.style.display = 'none';
            document.body.removeChild(messageModal);
			
			 
			    // Show WebGazer dot again
                if (webgazer) {
                 webgazer.showPredictionPoints(true); // Show WebGazer points
            }

            // Initialize the map
            document.getElementById('map').style.display = 'block';
            initMap(); // Initialize the map

            // Set up a timer to stop eye tracking after 15 seconds
            if (eyeTrackingTimeout) {
                clearTimeout(eyeTrackingTimeout);
            }
            eyeTrackingTimeout = setTimeout(stopEyeTracking, 15000); // Clear any previous timeout
        });
    }
	
	
    // Initialize the map
	function initMap() {
    if (mapInitialized) return; // If the map is already initialized, exit the function
        const map = L.map('map', {
            minZoom: 1,
            maxZoom: 4,
            center: [0, 0],
            zoom: 1,
            crs: L.CRS.Simple,
			zoomControl: false // Disable zoom control
        });

        const w = 1148;  // Image width in pixels
        const h = 660;  // Image height in pixels
        const url = 'images/map_1_ist6.png';  // Image URL

        const southWest = map.unproject([0, h], map.getMaxZoom() - 1);
        const northEast = map.unproject([w, 0], map.getMaxZoom() - 1);
        const bounds = new L.LatLngBounds(southWest, northEast);

        L.imageOverlay(url, bounds).addTo(map);
        map.setMaxBounds(bounds);
        map.fitBounds(bounds); // Ensure the map fits the image bounds
 
   }

    // Stop eye tracking and show the survey
    function stopEyeTracking() {
        console.log('Stopping eye tracking...');
        webgazer.end(); // Stop WebGazer
        document.getElementById('map').style.display = 'none'; // Hide the map

        // Stop the camera feed
        const videoElement = document.getElementById('camera-feed');
        if (videoElement.srcObject) {
            const stream = videoElement.srcObject;
            const tracks = stream.getTracks();

            tracks.forEach(track => track.stop()); // Stop each track

            videoElement.srcObject = null; // Disconnect the stream from the video element
        }

        console.log('Camera stopped.'); // Debugging log

        // Show the survey modal only once after stopping eye tracking
        if (!surveyShown) {
            console.log('Showing survey modal');
            showSurveyModal();
            surveyShown = true; // Set the flag to true immediately after showing the survey
        }
    }

    // Display the survey modal
    function showSurveyModal() {
        document.getElementById('survey-modal').style.display = 'block';
    }

    // Submit survey answer
    window.submitAnswer = function(answer) {
        console.log('Selected Answer:', answer);
        surveyAnswer = answer; // Store the survey answer
        closeSurvey(); // Close the survey modal after submission
    };

    // Close the survey modal and show the user information modal
    window.closeSurvey = function() {
        document.getElementById('survey-modal').style.display = 'none';
        document.getElementById('user-info-modal').style.display = 'block';
    };

    // Submit user information and show the thank you message
    window.submitUserInfo = function() {
        const age = document.getElementById('age').value;
        const gender = document.getElementById('gender').value;

        if (age && gender) {
            console.log('User Information:', `Age: ${age}, Gender: ${gender}`);

            // Add user information to results
            const userInfo = `User Age: ${age}, User Gender: ${gender}\n`;
            let textData = `User Information:\n${userInfo}\n`;

            // Save the results including user information only if not already saved
            if (!resultsSaved) {
                textData += saveResultsToWebApp(); // Get the text data
                submitResultsToWebApp(textData); // Submit results to the web app
                resultsSaved = true; // Set the flag to true after saving
            }

            // Close the user info modal and show thank you message
            closeUserInfo();
        } else {
            alert('Please fill out all fields.');
        }
    };

    // Function to save results to a text file and return the data
    function saveResultsToWebApp() {
        let textData = "Eye Tracking Data:\n";
        
        eyeTrackingData.forEach((data, index) => {
            textData += `Entry ${index + 1}: x=${data.gaze_x_percent}, y=${data.gaze_y_percent}, timestamp=${data.gaze_timestamp_ms}\n`;
            textData += `Saccade Amplitude Percent=${data.saccade_amplitude_percent}\n\n`;
        });

        textData += "Fixation Data:\n";
        fixationData.forEach((data, index) => {
            textData += `Fixation ${index + 1}: fixation_point_x=${data.fixation_point_x}, fixation_point_y=${data.fixation_point_y}\n`;
            textData += `Fixation Duration (ms)=${data.fixation_duration_ms}, Fixation Ends At (ms)=${data.fixation_ends_at_ms}\n\n`;
        });

        textData += `Survey Answer: ${surveyAnswer}\n`;
        return textData;
    }

    // Submit results to the web app (Google Apps Script)
    function submitResultsToWebApp(textData) {
        fetch('https://script.google.com/macros/s/AKfycbwRsSUWExGFLGF5X1NF9_EqwF61jYiAERqfapl-7H0I8L7Qo4glcAnuxxwAYe5uMG8BOg/exec', { // Replace with your Google Apps Script web app URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
			
			mode: 'no-cors', // Adding no-cors mode
            body: JSON.stringify({ data: textData }),
        })
        .then(response => response.json())  // Expect JSON response from the Google Apps Script
        .then(result => {
            if (result.success) {
                console.log('Data successfully saved to Google Drive:', result.message);
            } else {
                console.error('Failed to save data:', result.message);
            }
        })
        .catch(error => {
            console.error('Error sending data to the web app:', error);
        });
    }

    // Close the user info modal and show thank you message
    function closeUserInfo() {
        document.getElementById('user-info-modal').style.display = 'none';

        // Display a thank you message
        const thankYouModal = document.createElement('div');
        thankYouModal.className = 'modal';
        thankYouModal.style.display = 'block';

        const thankYouContent = document.createElement('div');
        thankYouContent.className = 'modal-content';
        thankYouContent.innerHTML = `
            <p>Thank you for participating in the survey!</p>
            <p>You may now close this window.</p>
            <button class="modal-button" onclick="closeThankYouMessage()">OK</button>
        `;
        thankYouModal.appendChild(thankYouContent);
        document.body.appendChild(thankYouModal);

        // Function to close the thank you message
        window.closeThankYouMessage = function() {
            thankYouModal.style.display = 'none';
            document.body.removeChild(thankYouModal);

            // Automatically close the window after showing the thank you message
            window.setTimeout(function() {
                window.close();
            }, 1000); // Wait 1 second before closing the window
        };
    }

    // Expose the camera access function globally
    window.requestCameraAccess = requestCameraAccess;
};
