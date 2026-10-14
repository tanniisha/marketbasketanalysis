import kagglehub
import shutil
import os

print("Downloading dataset...")
path = kagglehub.dataset_download("aslanahmedov/market-basket-analysis")
print("Downloaded dataset to:", path)

# Copy the dataset to the same directory as this script
target_dir = os.path.dirname(os.path.abspath(__file__))

for file in os.listdir(path):
    full_file_name = os.path.join(path, file)
    if os.path.isfile(full_file_name):
        shutil.copy(full_file_name, target_dir)

print(f"Dataset copied to {target_dir}")
