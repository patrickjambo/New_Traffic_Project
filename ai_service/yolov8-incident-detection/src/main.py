import sys
from src.train import IncidentAITrainer

def main():
    print("Welcome to the Incident Detection System")
    print("Select the workflow:")
    print("1. Complete Workflow")
    print("2. Manual Workflow")
    
    choice = input("Enter your choice (1 or 2): ")
    
    if choice == '1':
        trainer = IncidentAITrainer()
        trainer.run_complete_workflow()
    elif choice == '2':
        trainer = IncidentAITrainer()
        trainer.run_manual_workflow()
    else:
        print("Invalid choice. Exiting.")
        sys.exit(1)

if __name__ == "__main__":
    main()