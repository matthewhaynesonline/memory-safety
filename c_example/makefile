# =========
# Config
# =========

# Compiler settings
CC = clang
C_FLAGS = -std=c17 -O2 -Wall -Wextra -pedantic

# CPPC = clang++
# CPPC_FLAGS = -std=c++20 -O2 -Wall -Wextra -pedantic

TARGET_DIR = target

C_SOURCE = server.c
# CPP_SOURCE = server.cpp

C_TARGET = $(TARGET_DIR)/server
# CPP_TARGET = $(TARGET_DIR)/server_cpp

# ========
# Rules
# ========

# Create target directory if it doesn't exist
$(TARGET_DIR):
	@mkdir -p $(TARGET_DIR)
	@echo "Created target directory"

# Build C version
$(C_TARGET): $(C_SOURCE) | $(TARGET_DIR)
	@echo "Compiling C version..."
	$(CC) $(C_FLAGS) $(C_SOURCE) -o $(C_TARGET)
	@echo "C server built: $(C_TARGET)"

# # Build C++ version
# $(CPP_TARGET): $(CPP_SOURCE) | $(TARGET_DIR)
# 	@echo "Compiling C++ version..."
# 	$(CPPC) $(CPPC_FLAGS) $(CPP_SOURCE) -o $(CPP_TARGET)
# 	@echo "C++ server built: $(CPP_TARGET)"

# =============
# Targets
# =============

all: $(C_TARGET)
# all: $(C_TARGET) $(CPP_TARGET)
	@echo ""
	@echo "Build complete"
	@echo ""
	@echo "Run the C version:"
	@echo "  ./$(C_TARGET)"
# 	@echo ""
# 	@echo "Run the C++ version:"
# 	@echo "  ./$(CPP_TARGET)"
	@echo ""


c: $(C_TARGET)

# cpp: $(CPP_TARGET)

run-c: $(C_TARGET)
	@echo "Starting C server on port 8080..."
	@echo ""
	./$(C_TARGET)

# run-cpp: $(CPP_TARGET)
# 	@echo "Starting C++ server on port 8080..."
# 	@echo ""
# 	./$(CPP_TARGET)

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(TARGET_DIR)
	@echo "Clean complete"

rebuild: clean all

help:
	@echo "Simple Web Server Build System"
	@echo ""
	@echo "Available targets:"
# 	@echo "  make          - Build both C and C++ versions (default)"
# 	@echo "  make all      - Build both versions"
	@echo "  make c        - Build only C version"
# 	@echo "  make cpp      - Build only C++ version"
	@echo "  make run-c    - Build and run C version"
# 	@echo "  make run-cpp  - Build and run C++ version"
	@echo "  make clean    - Remove all build artifacts"
	@echo "  make rebuild  - Clean and build everything"
	@echo "  make help     - Show this help message"
	@echo ""

.PHONY: all c cpp run-c clean rebuild help