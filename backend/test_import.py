import traceback
import sys
try:
    import main
    print("Successfully imported main.py")
except BaseException as e:
    with open('error_log.txt', 'w') as f:
        traceback.print_exc(file=f)
    print(f"Error imported main.py, wrote to error_log.txt: {type(e)}")
