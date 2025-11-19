//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider, Contract } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  // Query InputVerifier EIP712 domain to get verifyingContract and chainId
  const inputVerifier = new Contract(
    parameters.metadata.InputVerifierAddress,
    [
      "function eip712Domain() view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"
    ],
    provider
  );
  const domain = await inputVerifier.eip712Domain();
  const domainChainId = Number(domain[3]); // uint256 chainId
  const verifyingContractAddressInputVerification = domain[4] as `0x${string}`; // address

  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: domainChainId,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption:
        "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification
    },
    {
      inputVerifierProperties: {},
      kmsVerifierProperties: {}
    }
  );
  return instance as unknown as FhevmInstance;
};
