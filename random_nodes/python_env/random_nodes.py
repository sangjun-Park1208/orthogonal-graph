import pandas as pd
pd.options.display.max_rows=10
pd.options.display.max_columns=10

draw=500
drawlist=[]

import random

for i in range(1,1063) :
    drawlist.append(i)
random.shuffle(drawlist)

fname_input = 'branch-1062.csv'
data=pd.read_csv(fname_input)

# for i in range(1,len(data)) :
#     for j in range(1,len(data)) :
#         for k in range(1,d) :
            # d
s_data=pd.DataFrame(columns=['from','to','r','x','b','tap'])

for k in range(1,draw) :
    for i in range(1,len(data)) :
        if drawlist[k]==data.iloc[i,0] :
            for t in range(1,draw) :
                if k==t :
                    continue
                if drawlist[t]==data.iloc[i,1] :
                    s_data.append(data.iloc[i,:])




s_data.to_csv('my.csv')


data.iloc[1,1]  # 접근


