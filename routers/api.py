import os
import time
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from models import AnalysisConfig
from services.analysis import load_and_preprocess_data, run_apriori, run_fpgrowth, generate_rules, generate_discount_suggestions

router = APIRouter()

# Store encoded dataframe in memory for simplicity in this prototype.
# In a real-world app, you might use a database or caching layer.
app_state = {
    "df_encoded": None,
    "last_dataset": None
}

# Provide the local path to the downloaded dataset
DEFAULT_DATASET_PATH = os.path.join(os.getcwd(), "dataset", "Assignment-1_Data.csv")
if not os.path.exists(DEFAULT_DATASET_PATH):
    # Fallback to root if it's there
    DEFAULT_DATASET_PATH = os.path.join(os.getcwd(), "Assignment-1_Data.csv")

@router.post("/load_default_dataset")
def load_default_dataset():
    if not os.path.exists(DEFAULT_DATASET_PATH):
        raise HTTPException(status_code=404, detail="Default dataset not found.")
    
    try:
        app_state["df_encoded"] = load_and_preprocess_data(DEFAULT_DATASET_PATH)
        app_state["last_dataset"] = "Assignment-1_Data.csv"
        return {"message": "Dataset loaded and preprocessed successfully", "transactions_count": len(app_state["df_encoded"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # Save uploaded file
    file_path = os.path.join(os.getcwd(), file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    try:
        app_state["df_encoded"] = load_and_preprocess_data(file_path)
        app_state["last_dataset"] = file.filename
        return {"message": "Dataset uploaded and preprocessed successfully", "transactions_count": len(app_state["df_encoded"])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/analyze/apriori")
def analyze_apriori(config: AnalysisConfig):
    if app_state["df_encoded"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please load or upload a dataset first.")
    
    frequent_itemsets, exec_time = run_apriori(app_state["df_encoded"], config.min_support)
    rules = generate_rules(frequent_itemsets, config.min_confidence, config.min_lift)
    discounts = generate_discount_suggestions(rules)
    
    # Convert sets to lists for JSON serialization
    frequent_itemsets['itemsets'] = frequent_itemsets['itemsets'].apply(list)
    if not rules.empty:
        rules['antecedents'] = rules['antecedents'].apply(list)
        rules['consequents'] = rules['consequents'].apply(list)
        
    return {
        "algorithm": "Apriori",
        "execution_time_seconds": exec_time,
        "frequent_itemsets_count": len(frequent_itemsets),
        "rules_count": len(rules),
        "total_transactions": len(app_state["df_encoded"]),
        "total_unique_items": len(app_state["df_encoded"].columns),
        "top_10_itemsets": frequent_itemsets.sort_values(by="support", ascending=False).head(10).to_dict(orient="records") if not frequent_itemsets.empty else [],
        "top_10_rules": rules.sort_values(by="lift", ascending=False).head(10).to_dict(orient="records") if not rules.empty else [],
        "discount_suggestions": discounts
    }

@router.post("/analyze/fpgrowth")
def analyze_fpgrowth(config: AnalysisConfig):
    if app_state["df_encoded"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please load or upload a dataset first.")
    
    frequent_itemsets, exec_time = run_fpgrowth(app_state["df_encoded"], config.min_support)
    rules = generate_rules(frequent_itemsets, config.min_confidence, config.min_lift)
    discounts = generate_discount_suggestions(rules)
    
    # Convert sets to lists for JSON serialization
    frequent_itemsets['itemsets'] = frequent_itemsets['itemsets'].apply(list)
    if not rules.empty:
        rules['antecedents'] = rules['antecedents'].apply(list)
        rules['consequents'] = rules['consequents'].apply(list)
        
    return {
        "algorithm": "FP-Growth",
        "execution_time_seconds": exec_time,
        "frequent_itemsets_count": len(frequent_itemsets),
        "rules_count": len(rules),
        "total_transactions": len(app_state["df_encoded"]),
        "total_unique_items": len(app_state["df_encoded"].columns),
        "top_10_itemsets": frequent_itemsets.sort_values(by="support", ascending=False).head(10).to_dict(orient="records") if not frequent_itemsets.empty else [],
        "top_10_rules": rules.sort_values(by="lift", ascending=False).head(10).to_dict(orient="records") if not rules.empty else [],
        "discount_suggestions": discounts
    }

@router.post("/analyze/compare")
def analyze_compare(config: AnalysisConfig):
    if app_state["df_encoded"] is None:
        raise HTTPException(status_code=400, detail="No dataset loaded. Please load or upload a dataset first.")
    
    # Run Apriori
    _, apriori_time = run_apriori(app_state["df_encoded"], config.min_support)
    
    # Run FP-Growth
    _, fp_time = run_fpgrowth(app_state["df_encoded"], config.min_support)
    
    return {
        "comparison": {
            "apriori_time_seconds": apriori_time,
            "fpgrowth_time_seconds": fp_time,
            "faster_algorithm": "FP-Growth" if fp_time < apriori_time else "Apriori"
        },
        "parameters_used": config.dict()
    }
