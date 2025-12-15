"""
Screen Capture Preprocessing Module for YOLO Training
This module provides preprocessing functions to enhance detection accuracy
for videos captured from screens during presentations.
"""
import React, { useState, useEffect } from 'react';
import { BarChart3, MapPin, AlertTriangle, Activity, Users, TrendingUp, Clock, Shield, X, ChevronDown, Bell, User, Settings, LogOut, Home, Map, FileText } from 'lucide-react';

const TrafficDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedCard, setSelectedCard] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Dashboard data
  const stats = [
    {
      id: 1,
      title: 'ACTIVE INCIDENTS',
      value: '3',
      subtitle: '2 Critical',
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/10',
      trend: '+15%',
      trendUp: false
    },
    {
      id: 2,
      title: 'AVG RESPONSE TIME',
      value: '3.8m',
      subtitle: '↓ 18% vs last week',
      icon: Clock,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      trend: '-18%',
      trendUp: true
    },
    {
      id: 3,
      title: 'RESOLVED TODAY',
      value: '47',
      subtitle: '94% Clearance Rate',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      trend: '+8%',
      trendUp: true
    },
    {
      id: 4,
      title: 'SYSTEM HEALTH',
      value: '99%',
      subtitle: 'All Systems Operational',
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      trend: '+2%',
      trendUp: true
    }
  ];

  const regions = [
    { name: 'Kigali City', value: 67, incidents: 234, officers: 89 },
    { name: 'Northern Province', value: 45, incidents: 123, officers: 45 },
    { name: 'Southern Province', value: 38, incidents: 98, officers: 52 },
    { name: 'Eastern Province', value: 52, incidents: 156, officers: 61 },
    { name: 'Western Province', value: 41, incidents: 112, officers: 48 }
  ];

  const recentIncidents = [
    { id: 1, type: 'Accident', location: 'KN 5 Ave, Kigali', time: '12m ago', severity: 'high', status: 'Active' },
    { id: 2, type: 'Traffic Jam', location: 'Nyabugogo', time: '25m ago', severity: 'medium', status: 'Active' },
    { id: 3, type: 'Road Block', location: 'Remera', time: '1h ago', severity: 'medium', status: 'Resolving' },
    { id: 4, type: 'Vehicle Check', location: 'Kimironko', time: '2h ago', severity: 'low', status: 'Completed' }
  ];

  const deployments = [
    { unit: 'Unit Alpha', location: 'Kigali CBD', officers: 12, status: 'Active', time: '3h 20m' },
    { unit: 'Unit Bravo', location: 'Nyabugogo', officers: 8, status: 'Active', time: '2h 45m' },
    { unit: 'Unit Charlie', location: 'Remera', officers: 6, status: 'Standby', time: '1h 15m' }
  ];

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Top Navigation Bar */}
      <nav className="bg-gradient-to-r from-slate-900/95 to-blue-900/95 backdrop-blur-xl border-b border-blue-500/20 px-6 py-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                RNP TRAFFIC
              </h1>
              <p className="text-xs text-blue-300">Traffic Management System</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center gap-2">
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <Map className="w-4 h-4" />
              Live Map
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Incidents
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </button>
          </div>

          {/* Right Section - Time, Notifications, User */}
          <div className="flex items-center gap-4">
            {/* Time Display */}
            <div className="text-right bg-white/5 px-4 py-2 rounded-lg border border-white/10">
              <div className="text-sm font-mono font-bold text-cyan-400">{formatTime(currentTime)}</div>
              <div className="text-xs text-blue-300">{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  3
                </span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-blue-500/20 shadow-2xl">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-bold text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Critical Incident</p>
                          <p className="text-xs text-gray-400">New accident reported at KN 5 Ave</p>
                          <p className="text-xs text-gray-500 mt-1">5 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <Users className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Unit Deployed</p>
                          <p className="text-xs text-gray-400">Unit Delta dispatched to Nyabugogo</p>
                          <p className="text-xs text-gray-500 mt-1">15 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-white/5 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <Shield className="w-4 h-4 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">Incident Resolved</p>
                          <p className="text-xs text-gray-400">Traffic jam cleared at Remera</p>
                          <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-gray-400">System Administrator</p>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-blue-500/20 shadow-2xl">
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                      <Settings className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Settings</span>
                    </button>
                    <div className="my-2 border-t border-white/10"></div>
                    <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-left text-red-400">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">>
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all hover:scale-105 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold ${stat.trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="text-sm text-blue-300 mb-2">{stat.title}</div>
            <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {stat.value}
            </div>
            <div className="text-xs text-gray-400">{stat.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Live Traffic Heatmap */}
        <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                LIVE TRAFFIC HEATMAP
              </h3>
              <p className="text-sm text-gray-400">Real-time traffic monitoring across Rwanda</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium">
                High Congestion (3)
              </span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium">
                Medium (7)
              </span>
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl h-80 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <MapPin className="w-16 h-16 text-blue-400 opacity-50" />
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Critical: Kigali CBD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Moderate: Nyabugogo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Overview */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-6 text-white">Regional Overview</h3>
          <div className="space-y-4">
            {regions.map((region, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{region.name}</span>
                  <span className="text-xl font-bold text-cyan-400">{region.value}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full bg-gradient-to-r ${
                      region.value > 60 ? 'from-green-500 to-emerald-500' :
                      region.value > 40 ? 'from-yellow-500 to-orange-500' :
                      'from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${region.value}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{region.incidents} incidents</span>
                  <span>{region.officers} officers</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Incident Feed</h3>
            <button className="text-blue-400 text-sm hover:text-blue-300">View All →</button>
          </div>
          
          {recentIncidents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>NO ACTIVE INCIDENTS</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}></div>
                      <div>
                        <div className="font-medium text-white">{incident.type}</div>
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {incident.location}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      incident.status === 'Active' ? 'bg-red-500/20 text-red-400' :
                      incident.status === 'Resolving' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">{incident.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Police Deployments */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Active Deployments</h3>
            <button className="text-blue-400 text-sm hover:text-blue-300">Manage →</button>
          </div>
          
          <div className="space-y-3">
            {deployments.map((deployment, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-4 hover:bg-slate-800/70 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{deployment.unit}</div>
                      <div className="text-sm text-gray-400">{deployment.location}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    deployment.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {deployment.status}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{deployment.officers} officers deployed</span>
                  <span>Active for {deployment.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficDashboard;
import cv2
import numpy as np
from PIL import Image, ImageEnhance
import random


def preprocess_screen_capture(frame):
    """
    Preprocess screen-captured frames before YOLO detection.
    Enhances image quality by removing screen artifacts and improving contrast.
    
    Args:
        frame: OpenCV image (numpy array)
        
    Returns:
        Preprocessed OpenCV image
    """
    # 1. Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    # 2. Reduce noise (from screen and camera sensor)
    denoised = cv2.fastNlMeansDenoisingColored(enhanced, None, 10, 10, 7, 21)
    
    # 3. Sharpen image to compensate for screen blur
    kernel = np.array([[-1, -1, -1],
                       [-1,  9, -1],
                       [-1, -1, -1]])
    sharpened = cv2.filter2D(denoised, -1, kernel)
    
    # 4. Auto white balance
    result = auto_white_balance(sharpened)
    
    return result


def auto_white_balance(image):
    """
    Apply automatic white balance to compensate for screen color temperature
    """
    result = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    avg_a = np.average(result[:, :, 1])
    avg_b = np.average(result[:, :, 2])
    result[:, :, 1] = result[:, :, 1] - ((avg_a - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result[:, :, 2] = result[:, :, 2] - ((avg_b - 128) * (result[:, :, 0] / 255.0) * 1.1)
    result = cv2.cvtColor(result, cv2.COLOR_LAB2BGR)
    return result


def add_screen_effects(image, intensity=1.0):
    """
    Add screen capture effects to training data for data augmentation.
    Use this to create synthetic training data from real traffic videos.
    
    Args:
        image: OpenCV image (numpy array)
        intensity: Effect intensity (0.0 to 1.0)
        
    Returns:
        Augmented OpenCV image with screen capture effects
    """
    # Convert to PIL Image for easier manipulation
    img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    
    # 1. Add brightness variation (screen brightness)
    brightness_factor = random.uniform(0.7, 1.3) * intensity
    brightness = ImageEnhance.Brightness(img)
    img = brightness.enhance(brightness_factor)
    
    # 2. Add contrast variation
    contrast_factor = random.uniform(0.8, 1.2) * intensity
    contrast = ImageEnhance.Contrast(img)
    img = contrast.enhance(contrast_factor)
    
    # Convert back to OpenCV format
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    
    # 3. Add slight blur (camera focus issues)
    if random.random() > 0.5:
        kernel_size = random.choice([3, 5])
        img_cv = cv2.GaussianBlur(img_cv, (kernel_size, kernel_size), 0)
    
    # 4. Add noise (camera sensor noise)
    noise_level = random.uniform(5, 15) * intensity
    noise = np.random.normal(0, noise_level, img_cv.shape)
    img_cv = np.clip(img_cv + noise, 0, 255).astype(np.uint8)
    
    # 5. Add perspective transform (filming at an angle)
    if random.random() > 0.5:
        img_cv = add_perspective_transform(img_cv, intensity)
    
    # 6. Add moiré pattern (optional, screen interference)
    if random.random() > 0.7:
        img_cv = add_moire_pattern(img_cv, intensity)
    
    # 7. Add screen glare spots
    if random.random() > 0.6:
        img_cv = add_glare_spots(img_cv, intensity)
    
    return img_cv


def add_perspective_transform(image, intensity=1.0):
    """
    Simulate filming screen at an angle
    """
    h, w = image.shape[:2]
    
    # Random perspective points
    offset = int(random.randint(10, 30) * intensity)
    pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
    pts2 = np.float32([
        [random.randint(0, offset), random.randint(0, offset)],
        [w - random.randint(0, offset), random.randint(0, offset)],
        [random.randint(0, offset), h - random.randint(0, offset)],
        [w - random.randint(0, offset), h - random.randint(0, offset)]
    ])
    
    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    result = cv2.warpPerspective(image, matrix, (w, h))
    return result


def add_moire_pattern(image, intensity=1.0):
    """
    Add moiré pattern from screen pixels
    """
    h, w = image.shape[:2]
    x = np.arange(w)
    y = np.arange(h)
    X, Y = np.meshgrid(x, y)
    
    # Create wave pattern with random frequency
    freq = random.uniform(0.05, 0.15)
    pattern = np.sin(X * freq) * np.sin(Y * freq) * (10 * intensity)
    pattern = pattern.astype(np.uint8)
    
    # Expand to 3 channels
    pattern_3ch = np.zeros_like(image)
    pattern_3ch[:, :, 0] = pattern
    pattern_3ch[:, :, 1] = pattern
    pattern_3ch[:, :, 2] = pattern
    
    # Blend with original image
    alpha = 0.05 * intensity
    result = cv2.addWeighted(image, 1 - alpha, pattern_3ch, alpha, 0)
    return result


def add_glare_spots(image, intensity=1.0):
    """
    Add screen glare/reflection spots
    """
    h, w = image.shape[:2]
    result = image.copy()
    
    # Add 1-3 random glare spots
    num_spots = random.randint(1, 3)
    for _ in range(num_spots):
        # Random position
        center_x = random.randint(0, w)
        center_y = random.randint(0, h)
        
        # Random size
        radius = random.randint(30, 100)
        
        # Create circular mask
        mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(mask, (center_x, center_y), radius, 255, -1)
        mask = cv2.GaussianBlur(mask, (51, 51), 0)
        
        # Create bright spot
        brightness = int(100 * intensity)
        bright_layer = result.copy()
        bright_layer = cv2.addWeighted(bright_layer, 1.0, 
                                       np.full_like(bright_layer, brightness), 
                                       0.5, 0)
        
        # Apply mask
        mask_3ch = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR) / 255.0
        result = (result * (1 - mask_3ch) + bright_layer * mask_3ch).astype(np.uint8)
    
    return result


def augment_training_video(input_video_path, output_folder, frames_per_second=5):
    """
    Process a training video and create screen-captured augmented versions.
    
    Args:
        input_video_path: Path to input video
        output_folder: Folder to save augmented frames
        frames_per_second: How many frames to sample per second
        
    Returns:
        Number of frames created
    """
    import os
    os.makedirs(output_folder, exist_ok=True)
    
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps / frames_per_second)
    
    frame_count = 0
    saved_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Only process every Nth frame
        if frame_count % frame_interval == 0:
            # Create 3 augmented versions with different intensities
            for i, intensity in enumerate([0.7, 1.0, 1.3]):
                augmented = add_screen_effects(frame, intensity=intensity)
                output_path = f"{output_folder}/frame_{saved_count:06d}_i{i}.jpg"
                cv2.imwrite(output_path, augmented)
            
            saved_count += 1
            if saved_count % 10 == 0:
                print(f"✅ Processed {saved_count} frames... ({saved_count * 3} images created)")
        
        frame_count += 1
    
    cap.release()
    total_images = saved_count * 3
    print(f"\n🎉 Dataset augmentation complete!")
    print(f"   📊 Total frames processed: {saved_count}")
    print(f"   🖼️  Total images created: {total_images}")
    print(f"   📁 Saved to: {output_folder}")
    
    return total_images


# Example usage
if __name__ == "__main__":
    # Example 1: Preprocess a single frame for detection
    test_frame = cv2.imread("test_screen_capture.jpg")
    if test_frame is not None:
        preprocessed = preprocess_screen_capture(test_frame)
        cv2.imwrite("preprocessed_output.jpg", preprocessed)
        print("✅ Preprocessed frame saved to preprocessed_output.jpg")
    
    # Example 2: Create augmented training dataset
    # augment_training_video(
    #     input_video_path="training_videos/accident_video.mp4",
    #     output_folder="augmented_dataset/accidents",
    #     frames_per_second=5
    # )
