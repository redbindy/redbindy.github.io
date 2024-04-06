---
layout: post
title: "DirectX11 튜토리얼 정리3: 간단한 쉐이더 활용(작성중)"
category: 컴퓨터공학
tags: [C/C++, DX11, DirectX11]
---

## 이전 게시글

&emsp;이전 게시글에서 내용과 코드가 이어집니다. 안 보고 오셨다면

### [DirectX11 튜토리얼 정리1: 화면 지우기](/컴퓨터공학/2024/03/20/DX11_ClearScreen.html)
### [DirectX11 튜토리얼 정리2: 삼각형 그리기](/컴퓨터공학/2024/03/29/DX11_DrawTriangle.html)

&emsp;먼저 보시는 것도 추천!

## 결과

![결과 이미지](/assets/images/2024-04-03-SimpleShader_images/result-ezgif-convertor.gif)

&emsp;3D 관련으로 가기 전에 간단하게 요런 변환을 다뤄봅시다. 볼륨이 적은 게시글이 될 것 같네요.

&emsp;녹화를 잘못했는지 검은 빈 부분이 있는데 거슬리긴 해도 일단 결과 잘 보이니 넘어가는 걸로...ㅋㅋㅋ(~~어차피 저만 보는 게시글이랑 다를바 없으니~~)

## 이번 게시글에서 사용할 전체 코드

**Jekyll 버그인지 코드 부분 부분에서 넣지도 않은 \가 출력되고 있네요. 참고해주십쇼!**

### C++

~~~ C++
~~~

### HLSL

#### VertexShader.hlsl

~~~ HLSL
~~~

#### PixelShader.hlsl

~~~ HLSL
~~~

## 코드 살펴보기

### 사용할 라이브러리 및 컴파일러 옵션

이전과 동일

### 윈도우 관련 코드

이전과 동일

### DirectX11

&emsp;이번 흐름은 다음과 같습니다.

1. 상수 버퍼(Constant Buffer)용 구조체 선언
2. 튜토리얼1, 2와 동일한 방식
3. 상수 버퍼용 개체 포인터 선언
4. 상수 버퍼 데이터 정의
5. 상수 버퍼 리소스 생성 및 상수 버퍼를 사용할 쉐이더에 설정
6. 상수 버퍼 업데이트 및 렌더링

#### 상수 버퍼(Constant Buffer)용 구조체 선언

~~~ C++
typedef struct
{
	XMMATRIX transfrom; // 정점 변환용 변수
} constant_buffer_t;
~~~

&emsp;이번 게시글에서는 요것만 사용할 예정입니다. 결과에서 계속 색깔 바뀌면서 회전 했던 것 치곤 별 거 없죠?ㅋㅋ 하지만 실제로는

~~~ C++
typedef struct
{
    // 행렬1 선언
    // 행렬2 선언
    // 행렬3 선언
    // 공통 상수 선언
    // ...
} constant_buffer_t;
~~~

&emsp;요런 식으로 꽤나 많은 정보를 넣어서 사용하긴 합니다. 추가적인 정보가 있는데 그건 차후에 말씀드립죠!

##### 상수 버퍼(Constant Buffer)

&emsp;일단 주 참고자료 설명으로는 어플리케이션이 쉐이더에게 넘길 데이터를 저장하는 장소 정도로 설명이 돼있네요. D3D11 버퍼 문서에서는 쉐이더 상수 데이터를 파이프라인에 효율적으로 공급하는 걸 도와주는 버퍼 정도로 나와있습니다. 그냥 한마디로 쉐이더에서 쓸 전역변수를 저장하는 곳이다 정도로 생각하면 좋을 것 같습니다.

#### 상수 버퍼용 개체 포인터 선언

~~~ C++
// ConstantBuffer: 쉐이더의 전역변수용 리소스 인터페이스
static constant_buffer_t sConstantBuffer;
static ID3D11Buffer* spConstantBuffer;
~~~

&emsp;사용할 상수 버퍼 및 상수 버퍼 리소스를 선언해줍시다. 제가 아직 방법을 모르는 걸 수도 있는데 상수 버퍼는 내용 변경이 필요한 경우 CPU에서 업데이트한 내용을 전송해서 사용하는터라 CPU에서 쓸 자리도 같이 잡는 게 보통이더군요. 여튼 그래서 `sConstantBuffer`도 같이 선언됩니다.

#### 상수 버퍼 데이터 정의

~~~ C++
// 회전에 사용할 변수 초기화
sConstantBuffer.transfrom = XMMatrixIdentity();

// 상수 버퍼에 대한 정보 구조체 초기화
D3D11_BUFFER_DESC constantBufferDesc;

constantBufferDesc.ByteWidth = sizeof(sConstantBuffer); // 버퍼의 바이트 크기
constantBufferDesc.Usage = D3D11_USAGE_DEFAULT; // 버퍼의 용도
constantBufferDesc.BindFlags = D3D11_BIND_CONSTANT_BUFFER; // 파이프라인에 뭘로 바인딩 할지
constantBufferDesc.CPUAccessFlags = 0; // CPU의 접근 권한
constantBufferDesc.MiscFlags = 0; // 리소스에 대한 옵션
constantBufferDesc.StructureByteStride = sizeof(sConstantBuffer.transfrom); // 각 요소별 바이트 크기

// 초기화할 상수 버퍼 서브리소스 구조체
D3D11_SUBRESOURCE_DATA constantBufferSubresource;

constantBufferSubresource.pSysMem = &sConstantBuffer; // 전송할 데이터 포인터
constantBufferSubresource.SysMemPitch = 0; // 다음 행으로 가기 위한 시스템 바이트 수
constantBufferSubresource.SysMemSlicePitch = 0; // 다음 면으로 가기 위한 시스템 바이트 수
~~~

&emsp;다른 버퍼랑 또오옥같습니다. 이젠 지겨운 방식이죠?ㅋㅋㅋ 플래그만 잘 설정해주면 사실상 끝 <br>
&emsp;제가 다른 버퍼 코드 복붙에서 값 넣어놔서 그렇긴 한데 코드는 더 덜어내서 써도 되긴 합니다.

#### 상수 버퍼 리소스 생성 및 상수 버퍼를 사용할 쉐이더에 설정

~~~ C++
	// 인덱스 버퍼 생성
	hr = spDevice->CreateBuffer(
		&constantBufferDesc, // 버퍼 정보 구조체 포인터
		&constantBufferSubresource, // 상수 버퍼 서브 리소스 포인터
		&spConstantBuffer // 만들어진 버퍼 리소스 포인터를 받을 주소
	);

	// 상수 버퍼 설정
	spDeviceContext->VSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);

	spDeviceContext->PSSetConstantBuffers(
		0, // 시작 슬롯
		1, // 설정할 버퍼의 수
		&spConstantBuffer // 설정할 버퍼 리소스 배열
	);
~~~

&emsp;여기도 뻔하죠?

#### 역시나

~~~ C++
void DestroyD3D11()
{
	if (spConstantBuffer != nullptr)
	{
		spConstantBuffer->Release();
		spConstantBuffer = nullptr;
	}

    // 생략
}
~~~

&emsp;해제 잘 해줍시다!

#### 상수 버퍼 업데이트 및 렌더링

~~~ C++
void Render()
{
	// 생략

	// 다음 변환 가중치 계산
	sConstantBuffer.transfrom *= XMMatrixRotationZ(XM_PI / 36);

	// HLSL 계산 방식으로 인한 전치
	XMMATRIX trTransform = XMMatrixTranspose(sConstantBuffer.transfrom);

	// 바인딩한 리소스 업데이트
	spDeviceContext->UpdateSubresource(
		spConstantBuffer, // 업데이트할 서브리소스 포인터
		0, // 업데이트할 서브리소스 번호
		nullptr, // 서브리소스 선택 박스 포인터
		&trTransform, // 업데이트에 사용할 데이터
		0, // 다음 행까지의 시스템 메모리 바이트 수
		0 // 다음 깊이까지의 시스템 메모리 바이트 수
	);

    // 생략
}
~~~

&emsp;상수 버퍼 내용을 다음 변환으로 업데이트하고 전송하는 부분만 적어놨습니다. 개인적으론 CPU에서 계산해서 넘겨주는 방식이 조금 독특하다 느껴지더군요ㅋㅋ <br>

$ [1, 2, 3, 4] $

### HLSL

## 소스코드 깃 주소

## 참고자료 및 출처
- [DirectX-SDK-Samples](https://github.com/walbourn/directx-sdk-samples)
- [MSDN - Introduction to Buffers in Direct3D 11](https://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-resources-buffers-intro#constant-buffer)
- [MSDN - How to: Create a Constant Buffer](https://learn.microsoft.com/ko-kr/windows/win32/direct3d11/overviews-direct3d-11-resources-buffers-constant-how-to)