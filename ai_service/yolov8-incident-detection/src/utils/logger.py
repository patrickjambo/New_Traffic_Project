import logging

class Logger:
    def __init__(self, name, log_file='app.log', level=logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        # Create file handler
        fh = logging.FileHandler(log_file)
        fh.setLevel(level)

        # Create console handler
        ch = logging.StreamHandler()
        ch.setLevel(level)

        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # Add formatter to handlers
        fh.setFormatter(formatter)
        ch.setFormatter(formatter)

        # Add handlers to the logger
        self.logger.addHandler(fh)
        self.logger.addHandler(ch)

    def get_logger(self):
        return self.logger

# Example usage:
# logger = Logger('IncidentDetectionSystem').get_logger()
# logger.info('This is an info message')