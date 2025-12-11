def save_model(model, filepath):
    """Saves the model weights to the specified filepath."""
    model.save_weights(filepath)
    print(f"Model weights saved to {filepath}")

def load_model(model, filepath):
    """Loads the model weights from the specified filepath."""
    model.load_weights(filepath)
    print(f"Model weights loaded from {filepath}")

def get_model_summary(model):
    """Prints the summary of the model architecture."""
    model.summary()