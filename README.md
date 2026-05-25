Salamander Video Tracker (Proof of Concept)
===========================================

An asynchronous web application that tracks individual salamanders in video streams using a custom-trained **YOLOv8** object detection model and **OpenCV**. The application runs frame-by-frame inference on a background thread, computes individual track metrics (time on screen), and records spatial coordinates for behavioral trajectory analysis.

🚀 Execution & Run Instructions
-------------------------------

### 1\. Prerequisites

Ensure your machine has **Node.js (v20.19+ or v22.12+)**, **Python 3.10+**, and a web browser installed.

### 2\. Backend Setup

1.  ```bash 
    cd backend
    ```
    
2.  ```bash
    pip install -r requirements.txt
    ```
    
3.  ```bash 
    python3 main.py
    ```  
    The server will boot up and listen on http://127.0.0.1:8000.
    

### 3\. Frontend Setup

1.  ```bash 
    cd frontend/salamander-frontend
    ```
    
2.  ```bash
    npm install
    ```
    
3.  ```bash
    npm run dev
    ```
    
4.  Click the link generated in your terminal (usually http://localhost:5173) to open the app. Upload a video clip and monitor the progress bar live!
    

📊 Dataset Details & Metrics Collection
---------------------------------------

### The Dataset

The model is trained explicitly on annotated images of salamanders to capture varied lighting conditions, wet skin glares, and complex substrates (moss, soil, rocks).

*   **Target Class:** 0: salamander
    
*   **Annotations:** Bounding boxes tracking localized coordinate frameworks ($xmin, ymin, xmax, ymax$).
    

### Custom Core Metrics Explained

The system automatically extracts two critical behaviors from the raw visual data:

1.  **Visual Duration (Time on Screen):** Computes individual visibility intervals. By mapping consecutive frames linked to a consistent track\_id, the system counts the total frames an individual was detected in and converts it to true time using the video's frame rate profile ($Time = \\frac{\\text{Frames Seen}}{\\text{FPS}}$).
    
2.  $$X\_{center} = \\frac{xmin + xmax}{2}$$$$Y\_{center} = \\frac{ymin + ymax}{2}$$
    

🔬 Comparison: YOLO Tracking vs. Color Masking
----------------------------------------------

When building a vision pipeline for wildlife tracking, choosing between traditional computer vision techniques like **Color Masking (HSV Thresholding)** and deep learning object detection (**YOLO Tracking**) yields significantly different results.

**FeatureColor Masking (HSV Thresholding)YOLOv8 Object TrackingCore Mechanism**Isolates pixels matching a specific range of hue, saturation, and value colors.Uses a deep convolutional neural network to learn geometric features, shapes, and textures.**Environmental RobustnessPoor.** Easily tripped up by changing shadows, background moss, wet rock glares, or muddy water matching the creature.**Excellent.** Recognizes the salamander regardless of background color, wet skin reflections, or varying outdoor light levels.**Occlusion HandlingFails.** If a salamander creeps under a leaf, its color mask breaks up, registering as a brand new object or completely vanishing.**Strong.** The integrated tracking state maintains identity persistence (track\_id) even during partial or brief occlusions.**Overlapping Objects**Treats multiple touching individuals as a single massive blob, ruining counts.Distinguishes overlapping boundaries and maintains separate track metrics for each distinct animal.**Setup Overhead**Requires manual, tedious fine-tuning of sliders for every single unique video or lighting scenario.High upfront training time/dataset generation, but highly adaptive across new environments once trained.

### 📝 Final Verdict

Traditional color masking is highly brittle and fails in native biological settings where habitats naturally mirror the creature's camouflage. YOLO tracking provides the structural stability needed for precise quantitative metrics, ensuring your research measurements (like velocity, counting, and individual screen duration) remain mathematically sound under variable field conditions.