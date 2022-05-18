import pandas as pd
pd.options.display.max_rows=10
pd.options.display.max_columns=10

#bus
fbus = 'bus-1062.csv'
bus_data=pd.read_csv(fbus)

draw=500
drawlist=[]

import random

for i in range(1,len(bus_data)+1) :
    drawlist.append(i)
random.shuffle(drawlist)

for i in range(len(drawlist)-1,draw-1,-1) :
    del drawlist[i]

drawlist.sort()

s_data=pd.DataFrame(columns=['id','type','pd','qd','bs','area','vmag','vang','branch_check'])

for i in range(0,draw) :
    for j in range(0,len(bus_data)) :
        if drawlist[i]==bus_data.iloc[j,0] :
            new_data={
                'id' : [bus_data.iloc[j,0]],
                'type' : [bus_data.iloc[j,1]],
                'pd' : [bus_data.iloc[j,2]],
                'qd' : [bus_data.iloc[j,3]],
                'bs' : [bus_data.iloc[j,4]],
                'area' : [bus_data.iloc[j,5]],
                'vmag' : [bus_data.iloc[j,6]],
                'vang' : [bus_data.iloc[j,7]],
                # 'branch_check' : ['0'],
            }
            new_df=pd.DataFrame(new_data)
            s_data=pd.concat([s_data,new_df])


# print(s_data.iloc[6,8])
# s_data.to_csv('my_bus.csv',index=False)


#branch
fbranch = 'branch-1062.csv'
branch_data=pd.read_csv(fbranch)

h_data=pd.DataFrame(columns=['from','to','r','x','b','tap'])

for k in range(0,draw) :
    for i in range(0,len(branch_data)) :
        if drawlist[k]==branch_data.iloc[i,0] :
            for t in range(0,draw) :
                if k==t :
                    continue
                if drawlist[t]==branch_data.iloc[i,1] :
                    for x in range(0,len(s_data)) :
                        if s_data.iloc[x,0]==branch_data.iloc[i,0] or s_data.iloc[x,0]==branch_data.iloc[i,1] :
                            s_data.iloc[x,8]='1'
                    new_data={
                        'from' : [branch_data.iloc[i,0]],
                        'to' : [branch_data.iloc[i,1]],
                        'r' : [branch_data.iloc[i,2]],
                        'x' : [branch_data.iloc[i,3]],
                        'b' : [branch_data.iloc[i,4]],
                        'tap' : [branch_data.iloc[i,5]],
                    }
                    new_df=pd.DataFrame(new_data)
                    h_data=pd.concat([h_data,new_df])
                    
# s_data.isnull()
# s_data.isnull().sum()

s_data=s_data.dropna()
s_data=s_data.drop(columns='branch_check')

s_data.to_csv('my_bus.csv',index=False)
h_data.to_csv('my_branch.csv',index=False)