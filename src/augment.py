import numpy as np
import json

with open('./data/twor_BEDROOM_1.json') as f:
    data = json.load(f)
print(data[0].keys())

print(len(data))
mini = 100000000000000000000
maxi = 0
for i in range(len(data)):
  mini = min(mini, data[i]["timestamp"])
  maxi = max(maxi, data[i]["timestamp"])

print(mini)
print(maxi)
