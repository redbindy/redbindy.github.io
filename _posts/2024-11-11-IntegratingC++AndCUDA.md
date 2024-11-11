---
layout: post
title: "비주얼스튜디오에서 C++, CUDA 연동하기"
category: 컴퓨터공학
tags: [C/C++, CUDA, 비주얼스튜디오]
---

어떻게 보면 자잘한 거라 까먹기 전에 메모겸 작성해봅니다ㅋㅋ

## 1. CUDA, 비주얼스튜디오 설치

는 이미 하셨을 거라 생각하고 생략! 아니어도 간단하니까 과정은 생략하고 링크만 남깁니다. <br>
[비주얼스튜디오 다운로드](https://visualstudio.microsoft.com/ko/downloads/) <br>
[CUDA Toolkit 다운로드](https://developer.nvidia.com/cuda-toolkit)

## 2. C++ 프로젝트 만들기 및 빌드 종속성 추가

- 솔루션 탐색기
- 프로젝트 우클릭
- 빌드 종속성
- 빌드 사용자 지정

![빌드 사용자 지정](/assets/images/2024-11-11-IntegratingC++AndCUDA/BuildCustomization.png)

- CUDA 항목 추가

![CUDA 항목 추가](/assets/images/2024-11-11-IntegratingC++AndCUDA/SelectingCUDAVersion.png)

## 3. 코드 작성

### main.cpp

~~~ C++
#include <iostream>
#include "GPU.h"

int main()
{
    dim3 gridDim = { 1, 1, 1 };
    dim3 blockDim = { 1, 1, 32 };

    CallPrintHelloGPU(gridDim, blockDim);

    int wait;
    std::cin >> wait;
}
~~~

### GPU.h

~~~ C++
#pragma once

#include "cuda_runtime.h"
#include "device_launch_parameters.h"

void CallPrintHelloGPU(const dim3 grid, const dim3 block);
~~~

### GPU.cu

~~~ C++
#include "GPU.h"

#include <stdio.h>

__global__ void PrintHelloGPU()
{
	printf("Hello ");
	printf("CUDA");
}

void CallPrintHelloGPU(const dim3 gridDim, const dim3 blockDim)
{
	PrintHelloGPU<<<gridDim, blockDim >>>();
}
~~~

### 주의사항

cuda 소스파일의 컴파일러가 cuda c++인지 확인해주십쇼!

- 소스코드 우클릭 및 속성
  - 혹은 소스파일 선택하고 alt + enter

![소스코드 속성](/assets/images/2024-11-11-IntegratingC++AndCUDA/CodeProperties.png)

- 컴파일러

![CUDA 컴파일러](/assets/images/2024-11-11-IntegratingC++AndCUDA/CUDACompiler.png)

## 실행 결과

![실행 결과](/assets/images/2024-11-11-IntegratingC++AndCUDA/Result.png)