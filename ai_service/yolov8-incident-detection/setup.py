from setuptools import setup, find_packages

setup(
    name="yolov8-incident-detection",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A YOLOv8 model for incident detection from screen-captured videos.",
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    install_requires=[
        "torch>=1.7.0",
        "torchvision>=0.8.0",
        "opencv-python",
        "numpy",
        "pandas",
        "PyYAML",
        "requests",
        "matplotlib",
        "scikit-learn",
        "pytest"
    ],
    entry_points={
        'console_scripts': [
            'incident_detection=main:main',  # Adjust according to your main function
        ],
    },
)