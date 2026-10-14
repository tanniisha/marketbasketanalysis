import pandas as pd
import time
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules

def load_and_preprocess_data(file_path: str):
    # This function depends on the dataset format.
    # Assuming it's a CSV with 'BillNo' and 'Itemname' columns for now, based on typical market basket datasets.
    # If the format is different, we will adjust this once we see the dataset.
    df = pd.read_csv(file_path, sep=';')
    
    # We need to group by transaction ID and get a list of items per transaction
    # We will adjust column names after inspecting the dataset
    if 'BillNo' in df.columns and 'Itemname' in df.columns:
        # Drop rows with missing Itemnames and convert to string to avoid float vs str comparison errors
        df = df.dropna(subset=['Itemname'])
        df['Itemname'] = df['Itemname'].astype(str)
        transactions = df.groupby('BillNo')['Itemname'].apply(list).tolist()
    else:
        # Fallback assuming each row is a transaction with comma-separated items
        transactions = df.astype(str).values.tolist()
        # Clean up 'nan' if any
        transactions = [[item for item in transaction if item != 'nan' and item is not None] for transaction in transactions]
    
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_encoded = pd.DataFrame(te_ary, columns=te.columns_)
    
    return df_encoded

def run_apriori(df_encoded, min_support: float):
    start_time = time.time()
    frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
    execution_time = time.time() - start_time
    return frequent_itemsets, execution_time

def run_fpgrowth(df_encoded, min_support: float):
    start_time = time.time()
    frequent_itemsets = fpgrowth(df_encoded, min_support=min_support, use_colnames=True)
    execution_time = time.time() - start_time
    return frequent_itemsets, execution_time

def generate_rules(frequent_itemsets, min_confidence: float, min_lift: float):
    if frequent_itemsets.empty:
        return pd.DataFrame()
    
    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
    if not rules.empty:
        rules = rules[rules['lift'] >= min_lift]
        
    return rules

def generate_discount_suggestions(rules):
    if rules.empty:
        return []
    
    suggestions = []
    # Sort rules by lift descending
    sorted_rules = rules.sort_values(by="lift", ascending=False)
    
    for _, rule in sorted_rules.head(15).iterrows():
        ant = list(rule['antecedents'])
        con = list(rule['consequents'])
        conf = rule['confidence']
        lift = rule['lift']
        
        ant_str = " + ".join(ant)
        con_str = " + ".join(con)
        
        if conf > 0.5:
            # High confidence -> Bundle offer
            suggestions.append({
                "type": "Bundle",
                "title": f"Bundle: {ant_str} & {con_str}",
                "description": f"Buy {ant_str} and get {con_str} at 10% off!",
                "reason": f"High probability ({conf*100:.1f}%) customers will buy both.",
                "lift": float(lift),
                "confidence": float(conf)
            })
        elif lift > 2.0:
            # High lift but lower confidence -> Cross-sell
            suggestions.append({
                "type": "Cross-Sell",
                "title": f"Cross-Sell: {con_str}",
                "description": f"When a customer adds {ant_str} to cart, prompt them to add {con_str} for a 15% discount.",
                "reason": f"Highly associated items (Lift: {lift:.2f}).",
                "lift": float(lift),
                "confidence": float(conf)
            })
            
    return suggestions
