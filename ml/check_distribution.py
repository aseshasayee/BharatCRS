import pandas as pd
import os

df_path = r"c:\Users\asesh\OneDrive\Desktop\projects\civic issue reporting\implementation\ml\bharatcrs_v3_20k.csv"

if os.path.exists(df_path):
    df = pd.read_csv(df_path)
    print("\nPRIMARY DOMAIN DISTRIBUTION:")
    print(df['primary_domain'].value_counts())
    print("\nPERCENTAGE:")
    print(df['primary_domain'].value_counts(normalize=True) * 100)
    
    # Save to a file so I can read it if stdout fails
    with open('distribution.txt', 'w') as f:
        f.write(str(df['primary_domain'].value_counts()))
else:
    print("Dataset not found.")
